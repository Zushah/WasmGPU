/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { alignTo, assert, isNonNegativeInt, resolveGPUBuffer } from "../utils";
import { StorageBuffer, type TypedArrayConstructor } from "./buffer";

export type ReadbackSource = GPUBuffer | StorageBuffer;

export type ReadbackRingDescriptor = {
    slots?: number;
    labelPrefix?: string;
};

type ReadbackSlot = {
    buffer: GPUBuffer;
    capacityBytes: number;
    tail: Promise<void>;
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
        return { buffer, capacityBytes: size, tail: Promise.resolve() };
    }

    private ensureNotDestroyed(): void {
        assert(!this.destroyed, "ReadbackRing is destroyed");
    }

    private assertSourceCanReadback(src: ReadbackSource): void {
        if (src instanceof StorageBuffer) {
            assert(src.canReadback, "ReadbackRing requires the source StorageBuffer to be created with copySrc: true");
            return;
        }
        const usage = resolveSourceUsage(src);
        if (usage !== null) assert((usage & GPUBufferUsage.COPY_SRC) !== 0, "ReadbackRing requires the source GPUBuffer to have GPUBufferUsage.COPY_SRC");
    }

    async read(src: ReadbackSource, srcOffsetBytes: number = 0, sizeBytes?: number, opts: { label?: string } = {}): Promise<ArrayBuffer> {
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
        const alignedSize = Math.max(4, alignTo(size, 4));
        assert(alignedSize <= remaining, `Aligned copy size (${alignedSize}) exceeds remaining bytes (${remaining}). copyBufferToBuffer requires multiples of 4.`);
        const slotIndex = this.cursor;
        this.cursor = (this.cursor + 1) % this.slots.length;
        const slot = this.slots[slotIndex];
        const run = async (): Promise<ArrayBuffer> => {
            this.ensureNotDestroyed();
            if (slot.buffer.mapState === "mapped" || slot.buffer.mapState === "pending") {
                try { slot.buffer.unmap(); } catch { /* ignore */ }
                assert(slot.buffer.mapState !== "mapped" && slot.buffer.mapState !== "pending", "ReadbackRing internal error: staging buffer is still mapped");
            }
            if (alignedSize > slot.capacityBytes) {
                try { slot.buffer.destroy(); } catch { /* ignore */ }
                const newSlot = this.createSlot(alignedSize, slotIndex);
                slot.buffer = newSlot.buffer;
                slot.capacityBytes = newSlot.capacityBytes; 
            }
            const srcBuf = resolveGPUBuffer(src);
            const encoder = this.device.createCommandEncoder({ label: opts.label ? `${opts.label}:copyToStaging` : `${this.labelPrefix}:copyToStaging` });
            encoder.copyBufferToBuffer(srcBuf, srcOffsetBytes, slot.buffer, 0, alignedSize);
            this.queue.submit([encoder.finish()]);
            try {
                await slot.buffer.mapAsync(GPUMapMode.READ, 0, alignedSize);
                const mapped = slot.buffer.getMappedRange(0, alignedSize);
                const out = (mapped as ArrayBuffer).slice(0, size);
                slot.buffer.unmap();
                return out;
            } catch (e) {
                try { slot.buffer.unmap(); } catch { /* ignore */ }
                throw e;
            }
        };
        const job = slot.tail.then(run, run);
        slot.tail = job.then(() => { /* done */ }, () => { /* done */ });
        return job;
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
            slot.tail = Promise.resolve();
        }

        this.slots.length = 0;
    }
}
