/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { alignTo, assert, isNonNegativeInt, resolveGPUBuffer } from "../utils";
import { StorageBuffer, assertStorageBufferAlive, validateStorageBufferRange, type TypedArrayConstructor } from "./buffer";

export type ReadbackSource = GPUBuffer | StorageBuffer;

export type ReadbackRingDescriptor = {
    slots?: number;
    labelPrefix?: string;
};

type ReadbackSlot = {
    buffer: GPUBuffer;
    capacityBytes: number;
    pending: number;
};

const resolveLogicalByteLength = (src: ReadbackSource): number => {
    if (src instanceof StorageBuffer) return src.byteLength;
    return Number(src.size);
};

const resolveSourceUsage = (src: ReadbackSource): number | null => {
    if (src instanceof StorageBuffer) return src.usage;
    const usage = (src as unknown as { usage?: number }).usage;
    return (typeof usage === "number") ? usage : null;
};

export class ReadbackRing {
    private readonly device: GPUDevice;
    private readonly queue: GPUQueue;
    private readonly labelPrefix: string;
    private readonly slots: ReadbackSlot[] = [];
    private cursor: number = 0;
    private destroyed: boolean = false;

    constructor(device: GPUDevice, queue: GPUQueue, desc: ReadbackRingDescriptor = {}) {
        this.device = device;
        this.queue = queue;
        const slotCount = Math.max(1, desc.slots ?? 3);
        this.labelPrefix = desc.labelPrefix ?? "WasmGPU:readback";
        for (let i = 0; i < slotCount; i++) this.slots.push(this.createSlot(4, i));
    }

    private createSlot(capacityBytes: number, index: number): ReadbackSlot {
        const size = Math.max(4, alignTo(capacityBytes, 4));
        const buffer = this.device.createBuffer({
            label: `${this.labelPrefix}:slot${index}`,
            size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        return { buffer, capacityBytes: size, pending: 0 };
    }

    private ensureNotDestroyed(): void {
        assert(!this.destroyed, "ReadbackRing is destroyed");
    }

    get isDestroyed(): boolean {
        return this.destroyed;
    }

    private assertSourceCanReadback(src: ReadbackSource): void {
        if (src instanceof StorageBuffer) {
            assertStorageBufferAlive(src);
            assert(src.canReadback, "ReadbackRing requires GPUBufferUsage.COPY_SRC (copySrc: true)");
            return;
        }
        const usage = resolveSourceUsage(src);
        if (usage !== null) assert((usage & GPUBufferUsage.COPY_SRC) !== 0, "ReadbackRing requires the source GPUBuffer to have GPUBufferUsage.COPY_SRC");
    }

    private validateReadRange(src: ReadbackSource, srcOffsetBytes: number, sizeBytes?: number): number {
        this.ensureNotDestroyed();
        assert(this.slots.length > 0, "ReadbackRing has no slots");
        assert(isNonNegativeInt(srcOffsetBytes), `srcOffsetBytes must be an integer >= 0 (got ${srcOffsetBytes})`);
        assert((srcOffsetBytes & 3) === 0, `srcOffsetBytes must be 4-byte aligned for readback (got ${srcOffsetBytes})`);
        this.assertSourceCanReadback(src);
        const logicalByteLength = resolveLogicalByteLength(src);
        const remaining = logicalByteLength - srcOffsetBytes;
        assert(remaining >= 0, `srcOffsetBytes (${srcOffsetBytes}) exceeds source byteLength (${logicalByteLength})`);
        const size = sizeBytes ?? remaining;
        assert(isNonNegativeInt(size), `sizeBytes must be an integer >= 0 (got ${size})`);
        assert(size <= remaining, `sizeBytes (${size}) exceeds remaining bytes (${remaining})`);
        if (src instanceof StorageBuffer) validateStorageBufferRange(src, srcOffsetBytes, size, true);
        return size;
    }

    private acquireSlot(alignedSize: number): number {
        let grow = -1;
        for (let k = 0; k < this.slots.length; k++) {
            const index = (this.cursor + k) % this.slots.length;
            const slot = this.slots[index];
            if (slot.pending !== 0 || slot.buffer.mapState !== "unmapped") continue;
            if (alignedSize <= slot.capacityBytes) { this.cursor = (index + 1) % this.slots.length; return index; }
            if (grow < 0) grow = index;
        }
        if (grow < 0) return -1;
        const slot = this.slots[grow];
        const grown = this.createSlot(alignedSize, grow);
        try { slot.buffer.destroy(); } catch { /* ignore */ }
        slot.buffer = grown.buffer;
        slot.capacityBytes = grown.capacityBytes;
        this.cursor = (grow + 1) % this.slots.length;
        return grow;
    }

    private stage(src: ReadbackSource, srcOffsetBytes: number, size: number, consume: (bytes: Uint8Array) => void, opts: { label?: string }): Promise<void> {
        if (size === 0) return Promise.resolve();
        const alignedSize = alignTo(size, 4);
        const physicalOffset = (src instanceof StorageBuffer ? src.offsetBytes : 0) + srcOffsetBytes;
        const physicalByteLength = Number(resolveGPUBuffer(src).size);
        assert(physicalOffset + alignedSize <= physicalByteLength, `Aligned copy range (offset ${physicalOffset}, size ${alignedSize}) exceeds physical source bytes (${physicalByteLength})`);
        const index = this.acquireSlot(alignedSize);
        const slot = (index >= 0) ? this.slots[index] : null;
        const staging = slot?.buffer ?? this.device.createBuffer({ label: `${this.labelPrefix}:snapshot`, size: alignedSize, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        try {
            const encoder = this.device.createCommandEncoder({ label: opts.label ? `${opts.label}:copyToStaging` : `${this.labelPrefix}:copyToStaging` });
            encoder.copyBufferToBuffer(resolveGPUBuffer(src), physicalOffset, staging, 0, alignedSize);
            this.queue.submit([encoder.finish()]);
        } catch (error) { if (!slot) staging.destroy(); throw error; }
        const run = async (): Promise<void> => {
            try {
                await staging.mapAsync(GPUMapMode.READ, 0, alignedSize);
                consume(new Uint8Array(staging.getMappedRange(0, alignedSize), 0, size));
            } finally {
                if (staging.mapState === "mapped") staging.unmap();
                if (!slot) staging.destroy();
            }
        };
        if (!slot) return run();
        slot.pending++;
        return run().finally(() => { slot.pending--; });
    }

    snapshot(src: ReadbackSource, srcOffsetBytes: number, sizeBytes: number, consume: (bytes: Uint8Array) => void, opts: { label?: string } = {}): Promise<void> {
        const size = this.validateReadRange(src, srcOffsetBytes, sizeBytes);
        return this.stage(src, srcOffsetBytes, size, consume, opts);
    }

    async read(src: ReadbackSource, srcOffsetBytes: number = 0, sizeBytes?: number, opts: { label?: string } = {}): Promise<ArrayBuffer> {
        const size = this.validateReadRange(src, srcOffsetBytes, sizeBytes);
        const out = new Uint8Array(size);
        await this.stage(src, srcOffsetBytes, size, (bytes) => out.set(bytes, 0), opts);
        return out.buffer;
    }

    async readIntoWasmMemory(mem: WebAssembly.Memory, dstPtrBytes: number, src: ReadbackSource, srcOffsetBytes: number = 0, sizeBytes?: number, opts: { label?: string } = {}): Promise<void> {
        assert(isNonNegativeInt(dstPtrBytes), `dstPtrBytes must be an integer >= 0 (got ${dstPtrBytes})`);
        const size = this.validateReadRange(src, srcOffsetBytes, sizeBytes);
        await this.stage(src, srcOffsetBytes, size, (bytes) => {
            const buffer = mem.buffer as unknown as ArrayBuffer;
            assert(dstPtrBytes + size <= buffer.byteLength, `readback destination exceeds WebAssembly memory (${dstPtrBytes} + ${size} > ${buffer.byteLength})`);
            new Uint8Array(buffer, dstPtrBytes, size).set(bytes, 0);
        }, opts);
    }

    async readAs<T extends ArrayBufferView<ArrayBuffer>>(ctor: TypedArrayConstructor<T>, src: ReadbackSource, srcOffsetBytes: number = 0, sizeBytes?: number, opts: { label?: string } = {}): Promise<T> {
        const bytes = await this.read(src, srcOffsetBytes, sizeBytes, opts);
        const bpe = ctor.BYTES_PER_ELEMENT;
        assert((bytes.byteLength % bpe) === 0, `readAs: byteLength (${bytes.byteLength}) is not divisible by BYTES_PER_ELEMENT (${bpe})`);
        const len = bytes.byteLength / bpe;
        return new ctor(bytes, 0, len);
    }

    readU32(src: ReadbackSource, elemOffset: number = 0, elemCount?: number, opts: { label?: string } = {}): Promise<Uint32Array> {
        assert(isNonNegativeInt(elemOffset), `elemOffset must be an integer >= 0 (got ${elemOffset})`);
        const byteOffset = elemOffset * 4;
        const byteLength = (elemCount === undefined) ? undefined : (elemCount * 4);
        return this.readAs(Uint32Array, src, byteOffset, byteLength, opts);
    }

    readF32(src: ReadbackSource, elemOffset: number = 0, elemCount?: number, opts: { label?: string } = {}): Promise<Float32Array> {
        assert(isNonNegativeInt(elemOffset), `elemOffset must be an integer >= 0 (got ${elemOffset})`);
        const byteOffset = elemOffset * 4;
        const byteLength = (elemCount === undefined) ? undefined : (elemCount * 4);
        return this.readAs(Float32Array, src, byteOffset, byteLength, opts);
    }

    async readScalarU32(src: ReadbackSource, srcOffsetBytes: number = 0, opts: { label?: string } = {}): Promise<number> {
        const out = await this.readAs(Uint32Array, src, srcOffsetBytes, 4, opts);
        return out[0] >>> 0;
    }

    async readScalarF32(src: ReadbackSource, srcOffsetBytes: number = 0, opts: { label?: string } = {}): Promise<number> {
        const out = await this.readAs(Float32Array, src, srcOffsetBytes, 4, opts);
        return out[0];
    }

    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        for (const slot of this.slots) {
            try { if (slot.buffer.mapState === "mapped" || slot.buffer.mapState === "pending") slot.buffer.unmap(); } catch { /* ignore */ }
            try { slot.buffer.destroy(); } catch { /* ignore */ }
        }
        this.slots.length = 0;
    }
}
