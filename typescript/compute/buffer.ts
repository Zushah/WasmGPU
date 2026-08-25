/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { alignTo, assert } from "../utils";

export interface TypedArrayConstructor<T extends ArrayBufferView<ArrayBuffer>> {
    readonly BYTES_PER_ELEMENT: number;
    new(buffer: ArrayBuffer, byteOffset?: number, length?: number): T;
}

const isArrayBufferView = (x: BufferSource): x is ArrayBufferView<ArrayBuffer> => {
    return ArrayBuffer.isView(x);
};

const resolveSourceRange = (data: BufferSource, srcOffsetBytes: number = 0, sizeBytes?: number): { buffer: ArrayBuffer; offset: number; size: number } => {
    if (isArrayBufferView(data)) {
        const baseOffset = data.byteOffset + srcOffsetBytes;
        const maxSize = data.byteLength - srcOffsetBytes;
        const size = (sizeBytes === undefined) ? maxSize : Math.min(maxSize, sizeBytes);
        return { buffer: data.buffer as unknown as ArrayBuffer, offset: baseOffset, size };
    }
    const maxSize = data.byteLength - srcOffsetBytes;
    const size = (sizeBytes === undefined) ? maxSize : Math.min(maxSize, sizeBytes);
    return { buffer: data, offset: srcOffsetBytes, size };
};

const queueWriteBufferAligned = (queue: GPUQueue, dst: GPUBuffer, dstOffsetBytes: number, data: BufferSource, srcOffsetBytes: number = 0, sizeBytes?: number): void => {
    assert(Number.isInteger(dstOffsetBytes) && dstOffsetBytes >= 0, `dstOffsetBytes must be an integer >= 0 (got ${dstOffsetBytes})`);
    const src = resolveSourceRange(data, srcOffsetBytes, sizeBytes);
    assert((dstOffsetBytes & 3) === 0, `dstOffsetBytes must be 4-byte aligned (got ${dstOffsetBytes})`);
    assert((src.offset & 3) === 0, `srcOffsetBytes must be 4-byte aligned (got ${src.offset})`);
    const alignedSize = alignTo(src.size, 4);
    if (alignedSize === src.size) {
        queue.writeBuffer(dst, dstOffsetBytes, src.buffer, src.offset, src.size);
        return;
    }
    const tmp = new Uint8Array(alignedSize);
    tmp.set(new Uint8Array(src.buffer, src.offset, src.size));
    queue.writeBuffer(dst, dstOffsetBytes, tmp, 0, alignedSize);
};

export abstract class GpuBuffer {
    readonly device: GPUDevice;
    readonly queue: GPUQueue;
    readonly buffer: GPUBuffer;
    readonly byteLength: number;
    readonly usage: GPUBufferUsageFlags;

    protected constructor(device: GPUDevice, queue: GPUQueue, buffer: GPUBuffer, byteLength: number, usage: GPUBufferUsageFlags) {
        this.device = device;
        this.queue = queue;
        this.buffer = buffer;
        this.byteLength = byteLength;
        this.usage = usage;
    }

    destroy(): void {
        this.buffer.destroy();
    }

    write(data: BufferSource, dstOffsetBytes: number = 0, srcOffsetBytes: number = 0, sizeBytes?: number): void {
        queueWriteBufferAligned(this.queue, this.buffer, dstOffsetBytes, data, srcOffsetBytes, sizeBytes);
    }

    writeFromArrayBuffer(src: ArrayBuffer, srcOffsetBytes: number, sizeBytes: number, dstOffsetBytes: number = 0): void {
        this.write(src, dstOffsetBytes, srcOffsetBytes, sizeBytes);
    }

    writeFromWasmMemory(mem: WebAssembly.Memory, srcPtrBytes: number, sizeBytes: number, dstOffsetBytes: number = 0): void {
        const view = new Uint8Array(mem.buffer as unknown as ArrayBuffer, srcPtrBytes >>> 0, sizeBytes >>> 0);
        this.write(view, dstOffsetBytes, 0, sizeBytes);
    }
}

export type StorageBufferDescriptor = {
    label?: string;
    byteLength?: number;
    data?: BufferSource;
    copyDst?: boolean;
    copySrc?: boolean;
    usage?: GPUBufferUsageFlags;
};

export class StorageBuffer extends GpuBuffer {
    readonly label: string | null;

    constructor(device: GPUDevice, queue: GPUQueue, desc: StorageBufferDescriptor) {
        const byteLength = desc.data ? resolveSourceRange(desc.data).size : (desc.byteLength ?? 0);
        assert(Number.isInteger(byteLength) && byteLength >= 0, `StorageBuffer.byteLength must be an integer >= 0 (got ${byteLength})`);
        const size = alignTo(byteLength, 4);
        let usage: GPUBufferUsageFlags = GPUBufferUsage.STORAGE;
        if (desc.copyDst !== false) usage |= GPUBufferUsage.COPY_DST;
        if (desc.copySrc) usage |= GPUBufferUsage.COPY_SRC;
        if (desc.usage) usage |= desc.usage;
        const buffer = device.createBuffer({
            label: desc.label,
            size: Math.max(4, size),
            usage,
            mappedAtCreation: !!desc.data
        });
        if (desc.data) {
            const src = resolveSourceRange(desc.data);
            const dstBytes = new Uint8Array(buffer.getMappedRange());
            dstBytes.set(new Uint8Array(src.buffer, src.offset, src.size), 0);
            if (src.size < dstBytes.byteLength) dstBytes.fill(0, src.size);
            buffer.unmap();
        }
        super(device, queue, buffer, byteLength, usage);
        this.label = desc.label ?? null;
    }

    get canReadback(): boolean {
        return (this.usage & GPUBufferUsage.COPY_SRC) !== 0;
    }

    async read(srcOffsetBytes: number = 0, sizeBytes?: number): Promise<ArrayBuffer> {
        assert(this.canReadback, "StorageBuffer.read() requires the buffer to be created with copySrc: true");
        assert(Number.isInteger(srcOffsetBytes) && srcOffsetBytes >= 0, `srcOffsetBytes must be an integer >= 0 (got ${srcOffsetBytes})`);
        const size = sizeBytes ?? (this.byteLength - srcOffsetBytes);
        assert(Number.isInteger(size) && size >= 0, `sizeBytes must be an integer >= 0 (got ${size})`);
        assert(srcOffsetBytes + size <= this.byteLength, `read range out of bounds (offset ${srcOffsetBytes}, size ${size}, byteLength ${this.byteLength})`);
        const alignedSize = alignTo(size, 4);
        const srcOffsetAligned = alignTo(srcOffsetBytes, 4);
        assert(srcOffsetAligned === srcOffsetBytes, `srcOffsetBytes must be 4-byte aligned for readback (got ${srcOffsetBytes})`);
        const staging = this.device.createBuffer({
            size: Math.max(4, alignedSize),
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
        });
        const encoder = this.device.createCommandEncoder();
        encoder.copyBufferToBuffer(this.buffer, srcOffsetBytes, staging, 0, alignedSize);
        this.queue.submit([encoder.finish()]);
        await staging.mapAsync(GPUMapMode.READ, 0, alignedSize);
        const mapped = staging.getMappedRange(0, alignedSize);
        const out = (mapped as ArrayBuffer).slice(0, size);
        staging.unmap();
        staging.destroy();
        return out;
    }

    async readAs<T extends ArrayBufferView<ArrayBuffer>>(ctor: TypedArrayConstructor<T>, srcOffsetBytes: number = 0, sizeBytes?: number): Promise<T> {
        const bytes = await this.read(srcOffsetBytes, sizeBytes);
        const bpe = ctor.BYTES_PER_ELEMENT;
        assert((bytes.byteLength % bpe) === 0, `readAs: byteLength (${bytes.byteLength}) is not divisible by BYTES_PER_ELEMENT (${bpe})`);
        const len = bytes.byteLength / bpe;
        return new ctor(bytes, 0, len);
    }
}

export type UniformBufferDescriptor = {
    label?: string;
    byteLength?: number;
    data?: BufferSource;
    usage?: GPUBufferUsageFlags;
};

export class UniformBuffer extends GpuBuffer {
    readonly label: string | null;

    constructor(device: GPUDevice, queue: GPUQueue, desc: UniformBufferDescriptor) {
        const byteLength = desc.data ? resolveSourceRange(desc.data).size : (desc.byteLength ?? 0);
        assert(Number.isInteger(byteLength) && byteLength >= 0, `UniformBuffer.byteLength must be an integer >= 0 (got ${byteLength})`);
        const size = alignTo(byteLength, 4);
        let usage: GPUBufferUsageFlags = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
        if (desc.usage) usage |= desc.usage;
        const buffer = device.createBuffer({
            label: desc.label,
            size: Math.max(4, size),
            usage,
            mappedAtCreation: !!desc.data
        });
        if (desc.data) {
            const src = resolveSourceRange(desc.data);
            const dstBytes = new Uint8Array(buffer.getMappedRange());
            dstBytes.set(new Uint8Array(src.buffer, src.offset, src.size), 0);
            if (src.size < dstBytes.byteLength) dstBytes.fill(0, src.size);
            buffer.unmap();
        }
        super(device, queue, buffer, byteLength, usage);
        this.label = desc.label ?? null;
    }
}
