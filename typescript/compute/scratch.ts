/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { alignTo, assert } from "../utils";

export type ScratchAllocatorDescriptor = {
    maxRetainedBytes?: number;
};

export type ScratchParams = { buffer: GPUBuffer; offset: number; size: number };

type ScratchLease = { buffer: GPUBuffer; size: number; marked: boolean; tick: number };
type ScratchBlock = { buffer: GPUBuffer; size: number; tick: number };
type ScratchChain = { blocks: ScratchBlock[]; index: number; offset: number };

const LABEL_PREFIX = "compute:scratch";
const FIRST_BLOCK_BYTES = 4096;
const MAX_GROWN_BLOCK_BYTES = 65536;
const MAX_POW2_CLASS_BYTES = 1_048_576;
const nextPow2 = (n: number): number => { let p = 1; while (p < n) p *= 2; return p; };
// Powers of two up to 1 MiB, then multiples of 1/16 of the next power of two, so large buffers waste under 12.5%.
const sizeClass = (n: number): number => { const p = nextPow2(n); return (p <= MAX_POW2_CLASS_BYTES) ? p : alignTo(n, p / 16); };
const emptyChain = (): ScratchChain => ({ blocks: [], index: 0, offset: 0 });

export class ScratchAllocator {
    private readonly device: GPUDevice;
    private readonly queue: GPUQueue;
    private readonly maxRetainedBytes: number;
    private readonly paramAlignment: number;
    private readonly free: Map<number, ScratchLease[]> = new Map();
    private readonly leased: ScratchLease[] = [];
    private chain: ScratchChain = emptyChain();
    private encoderChains: WeakMap<GPUCommandEncoder, ScratchChain> = new WeakMap();
    private freeUnmarkedBytes: number = 0;
    private chainBytes: number = 0;
    private tick: number = 0;

    constructor(device: GPUDevice, queue: GPUQueue, desc: ScratchAllocatorDescriptor = {}) {
        const maxRetainedBytes = desc.maxRetainedBytes ?? 67_108_864;
        assert(Number.isSafeInteger(maxRetainedBytes) && maxRetainedBytes >= 0, `scratch.maxRetainedBytes must be a safe integer >= 0 (got ${maxRetainedBytes})`);
        this.device = device;
        this.queue = queue;
        this.maxRetainedBytes = maxRetainedBytes;
        this.paramAlignment = Math.max(device.limits.minStorageBufferOffsetAlignment, device.limits.minUniformBufferOffsetAlignment);
    }

    acquire(byteLength: number, label?: string): GPUBuffer {
        assert(Number.isInteger(byteLength) && byteLength >= 0, `ScratchAllocator.acquire: byteLength must be an integer >= 0 (got ${byteLength})`);
        const aligned = Math.max(256, alignTo(byteLength, 4));
        const limit = this.device.limits.maxBufferSize;
        assert(aligned <= limit, `${label ?? "ScratchAllocator.acquire"}: a ${aligned}-byte scratch buffer exceeds device.limits.maxBufferSize (${limit}); request larger maxStorageBufferBindingSize and maxBufferSize limits through the renderer's device descriptor`);
        const rounded = sizeClass(aligned);
        const size = (rounded <= limit) ? rounded : aligned;
        let lease = this.free.get(size)?.pop();
        if (lease) { if (!lease.marked) this.freeUnmarkedBytes -= size; }
        else lease = { buffer: this.device.createBuffer({ label: `${LABEL_PREFIX}:${label ?? size}`, size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST }), size, marked: false, tick: 0 };
        this.leased.push(lease);
        return lease.buffer;
    }

    params(data: BufferSource, encoder: GPUCommandEncoder | undefined): ScratchParams {
        const size = data.byteLength;
        assert(size >= 4 && (size % 4) === 0, `ScratchAllocator.params: byteLength must be a positive multiple of 4 (got ${size})`);
        let chain = this.chain;
        if (encoder) {
            chain = this.encoderChains.get(encoder) ?? emptyChain();
            this.encoderChains.set(encoder, chain);
        }
        let block = chain.blocks[chain.index];
        let offset = alignTo(chain.offset, this.paramAlignment);
        while (block && offset + size > block.size) { block = chain.blocks[++chain.index]; offset = 0; }
        if (!block) {
            const previous = chain.blocks[chain.blocks.length - 1];
            const grown = Math.max(previous ? Math.min(2 * previous.size, MAX_GROWN_BLOCK_BYTES) : FIRST_BLOCK_BYTES, sizeClass(size));
            const limit = this.device.limits.maxBufferSize;
            assert(size <= limit, `ScratchAllocator.params: a ${size}-byte parameter block exceeds device.limits.maxBufferSize (${limit}); request larger maxStorageBufferBindingSize and maxBufferSize limits through the renderer's device descriptor`);
            const blockSize = (grown <= limit) ? grown : size;
            block = { buffer: this.device.createBuffer({ label: `${LABEL_PREFIX}:params${encoder ? ":encoder" : ""}`, size: blockSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST }), size: blockSize, tick: 0 };
            chain.blocks.push(block);
            chain.index = chain.blocks.length - 1;
            if (!encoder) this.chainBytes += blockSize;
        }
        block.tick = this.tick;
        chain.offset = offset + size;
        this.queue.writeBuffer(block.buffer, offset, data);
        return { buffer: block.buffer, offset, size };
    }

    reset(encoder?: GPUCommandEncoder): void {
        for (const lease of this.leased) {
            if (encoder) lease.marked = true;
            else if (!lease.marked) this.freeUnmarkedBytes += lease.size;
            lease.tick = this.tick;
            let list = this.free.get(lease.size);
            if (!list) { list = []; this.free.set(lease.size, list); }
            list.push(lease);
        }
        this.leased.length = 0;
        this.chain.index = 0;
        this.chain.offset = 0;
        this.tick++;
        if (this.freeUnmarkedBytes + this.chainBytes > this.maxRetainedBytes) this.trim();
    }

    private trim(): void {
        const idle: Array<ScratchLease | ScratchBlock> = [...this.chain.blocks];
        for (const list of this.free.values()) for (const lease of list) if (!lease.marked) idle.push(lease);
        idle.sort((a, b) => a.tick - b.tick);
        const dropped = new Set<ScratchLease | ScratchBlock>();
        for (const item of idle) {
            if (this.freeUnmarkedBytes + this.chainBytes <= this.maxRetainedBytes) break;
            item.buffer.destroy();
            dropped.add(item);
            if ("marked" in item) this.freeUnmarkedBytes -= item.size;
            else this.chainBytes -= item.size;
        }
        this.chain.blocks = this.chain.blocks.filter((block) => !dropped.has(block));
        for (const [size, list] of this.free) {
            const kept = list.filter((lease) => !dropped.has(lease));
            if (kept.length > 0) this.free.set(size, kept);
            else this.free.delete(size);
        }
    }

    destroy(): void {
        for (const list of this.free.values()) for (const lease of list) if (!lease.marked) lease.buffer.destroy();
        for (const block of this.chain.blocks) block.buffer.destroy();
        this.free.clear();
        this.leased.length = 0;
        this.chain = emptyChain();
        this.encoderChains = new WeakMap();
        this.freeUnmarkedBytes = 0;
        this.chainBytes = 0;
    }
}
