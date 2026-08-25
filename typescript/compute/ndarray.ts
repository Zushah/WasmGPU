/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { alignTo, assert } from "../utils";
import { StorageBuffer, type StorageBufferDescriptor } from "./buffer";
import { wasm, type WasmPtr } from "../wasm";
import type { ReadbackRing } from "./readback";

export type DType = "i8" | "u8" | "i16" | "u16" | "i32" | "u32" | "f32" | "f64";

export type NdarrayResidency = "cpu-webassembly" | "gpu-storagebuffer";

export type NumberTypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;

export interface NumberTypedArrayConstructor<T extends NumberTypedArray> {
    readonly BYTES_PER_ELEMENT: number;
    new(buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
}

export type DTypeInfo<T extends NumberTypedArray = NumberTypedArray> = {
    readonly dtype: DType;
    readonly ctor: NumberTypedArrayConstructor<T>;
    readonly bytesPerElement: number;
    readonly wgslScalarType: "i32" | "u32" | "f32" | null;
};

const DTYPE_TABLE: Record<DType, DTypeInfo> = {
    i8: { dtype: "i8", ctor: Int8Array, bytesPerElement: 1, wgslScalarType: null },
    u8: { dtype: "u8", ctor: Uint8Array, bytesPerElement: 1, wgslScalarType: null },
    i16: { dtype: "i16", ctor: Int16Array, bytesPerElement: 2, wgslScalarType: null },
    u16: { dtype: "u16", ctor: Uint16Array, bytesPerElement: 2, wgslScalarType: null },
    i32: { dtype: "i32", ctor: Int32Array, bytesPerElement: 4, wgslScalarType: "i32" },
    u32: { dtype: "u32", ctor: Uint32Array, bytesPerElement: 4, wgslScalarType: "u32" },
    f32: { dtype: "f32", ctor: Float32Array, bytesPerElement: 4, wgslScalarType: "f32" },
    f64: { dtype: "f64", ctor: Float64Array, bytesPerElement: 8, wgslScalarType: null }
};

export const dtypeInfo = (dtype: DType): DTypeInfo => {
    const info = DTYPE_TABLE[dtype];
    if (!info) throw new Error(`Unknown dtype: ${String(dtype)}`);
    return info;
};

export type NdLayoutDescriptor = {
    shape: ReadonlyArray<number>;
    stridesBytes?: ReadonlyArray<number>;
    offsetBytes?: number;
};

const validateShape = (shape: ReadonlyArray<number>): number[] => {
    assert(Array.isArray(shape), "shape must be an array of dimension sizes");
    const out: number[] = new Array(shape.length);
    for (let i = 0; i < shape.length; i++) {
        const d = shape[i] as number;
        assert(Number.isInteger(d) && d >= 0, `shape[${i}] must be an integer >= 0 (got ${d})`);
        assert(d <= 0xFFFFFFFF, `shape[${i}] must fit in u32 (got ${d})`);
        out[i] = d;
    }
    return out;
};

const defaultRowMajorStridesBytes = (shape: ReadonlyArray<number>, bytesPerElement: number): number[] => {
    const ndim = shape.length;
    const strides: number[] = new Array(ndim);
    let stride = bytesPerElement;
    for (let i = ndim - 1; i >= 0; i--) {
        assert(Number.isInteger(stride) && stride >= 0, "Stride overflow while computing row-major strides");
        assert(stride <= 0x7FFFFFFF, `row-major stride exceeds i32 range (got ${stride})`);
        strides[i] = stride;
        stride = stride * shape[i]!;
        assert(Number.isFinite(stride) && stride >= 0, "Stride overflow while computing row-major strides");
        assert(stride <= Number.MAX_SAFE_INTEGER, "Stride overflow while computing row-major strides");
    }
    return strides;
};

const validateStridesBytes = (stridesBytes: ReadonlyArray<number>, ndim: number, bytesPerElement: number): number[] => {
    assert(Array.isArray(stridesBytes), "stridesBytes must be an array");
    assert(stridesBytes.length === ndim, `stridesBytes length (${stridesBytes.length}) must equal shape length (${ndim})`);
    const out: number[] = new Array(ndim);
    for (let i = 0; i < ndim; i++) {
        const s = stridesBytes[i] as number;
        assert(Number.isInteger(s), `stridesBytes[${i}] must be an integer (got ${s})`);
        assert(s >= -0x80000000 && s <= 0x7FFFFFFF, `stridesBytes[${i}] must fit in i32 (got ${s})`);
        assert((s % bytesPerElement) === 0, `stridesBytes[${i}] (${s}) must be a multiple of bytesPerElement (${bytesPerElement})`);
        out[i] = s;
    }
    return out;
};

const validateOffsetBytes = (offsetBytes: number | undefined, bytesPerElement: number): number => {
    const off = offsetBytes ?? 0;
    assert(Number.isInteger(off) && off >= 0, `offsetBytes must be an integer >= 0 (got ${off})`);
    assert((off % bytesPerElement) === 0, `offsetBytes (${off}) must be a multiple of bytesPerElement (${bytesPerElement})`);
    return off;
};

const numelFromShape = (shape: ReadonlyArray<number>): number => {
    let n = 1;
    for (let i = 0; i < shape.length; i++) {
        n *= shape[i]!;
        if (shape[i]! === 0) return 0;
        assert(Number.isFinite(n), "numel overflow");
    }
    return n;
};

const requiredBackingBytes = (shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>, offsetBytes: number, bytesPerElement: number): number => {
    if (shape.length === 0) {
        const req = offsetBytes + bytesPerElement;
        assert(req <= 0xFFFFFFFF, `required backing bytes exceeds wasm32 address space (got ${req})`);
        return req;
    }
    if (numelFromShape(shape) === 0) return 0;
    let min = BigInt(offsetBytes);
    let max = BigInt(offsetBytes);
    for (let i = 0; i < shape.length; i++) {
        const dim = shape[i]!;
        const s = BigInt(stridesBytes[i]!);
        const extent = BigInt(dim - 1) * s;
        if (extent < 0n) min += extent;
        else max += extent;
    }
    assert(min >= 0n, `layout underflows: minimum byte offset is ${min} (offsetBytes is too small for negative strides)`);
    const req = max + BigInt(bytesPerElement);
    assert(req <= BigInt(0xFFFFFFFF), `required backing bytes exceeds wasm32 address space (got ${req})`);
    return Number(req);
};

const isContiguousRowMajor = (shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>, offsetBytes: number, bytesPerElement: number): boolean => {
    if (offsetBytes !== 0) return false;
    if (shape.length === 0) return true;
    if (numelFromShape(shape) === 0) return true;
    const expected = defaultRowMajorStridesBytes(shape, bytesPerElement);
    for (let i = 0; i < shape.length; i++) if (stridesBytes[i] !== expected[i]) return false;
    return true;
};

export abstract class Ndarray {
    readonly dtype: DType;
    readonly shape: number[];
    readonly stridesBytes: number[];
    readonly offsetBytes: number;
    readonly bytesPerElement: number;
    readonly numel: number;
    readonly byteLength: number;

    protected constructor(dtype: DType, shape: number[], stridesBytes: number[], offsetBytes: number, byteLength: number) {
        this.dtype = dtype;
        this.shape = shape;
        this.stridesBytes = stridesBytes;
        this.offsetBytes = offsetBytes;
        this.bytesPerElement = dtypeInfo(dtype).bytesPerElement;
        this.numel = numelFromShape(shape);
        this.byteLength = byteLength;
    }

    get ndim(): number {
        return this.shape.length;
    }

    get wgslScalarType(): DTypeInfo["wgslScalarType"] {
        return dtypeInfo(this.dtype).wgslScalarType;
    }

    get isContiguousC(): boolean {
        return isContiguousRowMajor(this.shape, this.stridesBytes, this.offsetBytes, this.bytesPerElement);
    }

    layout(): { shape: number[]; stridesBytes: number[]; offsetBytes: number } {
        return { shape: this.shape.slice(), stridesBytes: this.stridesBytes.slice(), offsetBytes: this.offsetBytes };
    }

    abstract get residency(): NdarrayResidency;
}

export class CPUndarray extends Ndarray {
    private _basePtrBytes: WasmPtr;
    private _shapePtr: WasmPtr;
    private _stridesPtr: WasmPtr;
    private _destroyed: boolean = false;
    private _buf: ArrayBuffer | null = null;
    private _all: NumberTypedArray | null = null;

    private constructor(dtype: DType, shape: number[], stridesBytes: number[], offsetBytes: number, byteLength: number, basePtrBytes: WasmPtr, shapePtr: WasmPtr, stridesPtr: WasmPtr) {
        super(dtype, shape, stridesBytes, offsetBytes, byteLength);
        this._basePtrBytes = basePtrBytes;
        this._shapePtr = shapePtr;
        this._stridesPtr = stridesPtr;
    }

    static empty(dtype: DType, layout: NdLayoutDescriptor): CPUndarray {
        wasm.memory();
        const info = dtypeInfo(dtype);
        const shape = validateShape(layout.shape);
        const offsetBytes = validateOffsetBytes(layout.offsetBytes, info.bytesPerElement);
        const stridesBytes = layout.stridesBytes ? validateStridesBytes(layout.stridesBytes, shape.length, info.bytesPerElement) : defaultRowMajorStridesBytes(shape, info.bytesPerElement);
        const byteLength = requiredBackingBytes(shape, stridesBytes, offsetBytes, info.bytesPerElement);
        const ndim = shape.length >>> 0;
        let shapePtr = 0;
        let stridesPtr = 0;
        let basePtrBytes = 0;
        try {
            shapePtr = wasm.allocU32(ndim);
            assert(shapePtr !== 0 || ndim === 0, `CPUndarray.empty(): shape allocation failed (${ndim} elements)`);
            stridesPtr = wasm.allocU32(ndim);
            assert(stridesPtr !== 0 || ndim === 0, `CPUndarray.empty(): strides allocation failed (${ndim} elements)`);
            const shapeView = wasm.u32view(shapePtr, ndim);
            for (let i = 0; i < shape.length; i++) shapeView[i] = shape[i]! >>> 0;
            const strideView = wasm.i32view(stridesPtr, ndim);
            for (let i = 0; i < stridesBytes.length; i++) strideView[i] = stridesBytes[i]! | 0;
            basePtrBytes = (byteLength > 0) ? wasm.allocBytes(byteLength >>> 0) : 0;
            assert(basePtrBytes !== 0 || byteLength === 0, `CPUndarray.empty(): backing allocation failed (${byteLength} bytes)`);
            return new CPUndarray(dtype, shape, stridesBytes, offsetBytes, byteLength, basePtrBytes, shapePtr, stridesPtr);
        } catch (error) {
            if (basePtrBytes) wasm.freeBytes(basePtrBytes, byteLength >>> 0);
            if (stridesPtr) wasm.freeU32(stridesPtr, ndim);
            if (shapePtr) wasm.freeU32(shapePtr, ndim);
            throw error;
        }
    }

    static zeros(dtype: DType, layout: NdLayoutDescriptor): CPUndarray {
        const a = CPUndarray.empty(dtype, layout);
        try {
            a.zero_();
            return a;
        } catch (error) {
            a.destroy();
            throw error;
        }
    }

    static fromArray<T extends ArrayLike<number>>(dtype: DType, shape: ReadonlyArray<number>, src: T): CPUndarray {
        const dst = CPUndarray.empty(dtype, { shape });
        try {
            assert(dst.isContiguousC, "CPUndarray.fromArray currently requires a contiguous row-major layout");
            assert(src.length >= dst.numel, `source length (${src.length}) must be >= numel (${dst.numel})`);
            const data = dst.data();
            for (let i = 0; i < dst.numel; i++) data[i] = src[i] as number;
            return dst;
        } catch (error) {
            dst.destroy();
            throw error;
        }
    }

    get residency(): NdarrayResidency {
        return "cpu-webassembly";
    }

    get destroyed(): boolean {
        return this._destroyed;
    }

    get basePtrBytes(): WasmPtr {
        this.assertAlive();
        return this._basePtrBytes;
    }

    get shapePtr(): WasmPtr {
        this.assertAlive();
        return this._shapePtr;
    }

    get stridesPtr(): WasmPtr {
        this.assertAlive();
        return this._stridesPtr;
    }

    private assertAlive(): void {
        assert(!this._destroyed, "CPUndarray has been destroyed");
    }

    private ensureAllView(): NumberTypedArray {
        this.assertAlive();
        const buf = wasm.memory().buffer as unknown as ArrayBuffer;
        if (this._buf !== buf) {
            this._buf = buf;
            const ctor = dtypeInfo(this.dtype).ctor;
            this._all = new ctor(buf) as NumberTypedArray;
        }
        return this._all!;
    }

    backingBytes(): Uint8Array<ArrayBuffer> {
        this.assertAlive();
        if (this.byteLength === 0) return new Uint8Array(wasm.memory().buffer as unknown as ArrayBuffer, 0, 0) as unknown as Uint8Array<ArrayBuffer>;
        return wasm.u8view(this._basePtrBytes, this.byteLength >>> 0);
    }

    data(): NumberTypedArray {
        this.assertAlive();
        assert(this.isContiguousC, "CPUndarray.data() requires a contiguous row-major layout (use backingBytes() for raw backing storage)");
        if (this.numel === 0) {
            const buf = wasm.memory().buffer as unknown as ArrayBuffer;
            const ctor = dtypeInfo(this.dtype).ctor;
            return new ctor(buf, 0, 0) as NumberTypedArray;
        }
        return new (dtypeInfo(this.dtype).ctor)(wasm.memory().buffer as unknown as ArrayBuffer, (this._basePtrBytes + this.offsetBytes) >>> 0, this.numel >>> 0) as NumberTypedArray;
    }

    private offsetBytesAt(indices: ReadonlyArray<number>): number {
        this.assertAlive();
        assert(indices.length === this.ndim, `expected ${this.ndim} indices, got ${indices.length}`);
        if (this.ndim === 0) return this.offsetBytes;
        let off = this.offsetBytes;
        for (let i = 0; i < this.ndim; i++) {
            const v = indices[i] as number;
            assert(Number.isInteger(v) && v >= 0, `index[${i}] must be an integer >= 0 (got ${v})`);
            assert(v <= 0xFFFFFFFF, `index[${i}] must fit in u32 (got ${v})`);
            assert(v < this.shape[i]!, "index out of bounds (or offset overflow)");
            off += this.stridesBytes[i]! * v;
        }
        assert(Number.isSafeInteger(off) && off >= 0 && off <= 0xFFFFFFFF, "index out of bounds (or offset overflow)");
        assert(off + this.bytesPerElement <= this.byteLength, "computed byte offset is outside backing storage");
        return off;
    }

    get(...indices: number[]): number {
        const off = this.offsetBytesAt(indices);
        const abs = (this._basePtrBytes + off) >>> 0;
        assert((abs % this.bytesPerElement) === 0, "internal error: misaligned element address");
        const i = abs / this.bytesPerElement;
        const all = this.ensureAllView() as any;
        return all[i] as number;
    }

    set(value: number, ...indices: number[]): void {
        const off = this.offsetBytesAt(indices);
        const abs = (this._basePtrBytes + off) >>> 0;
        assert((abs % this.bytesPerElement) === 0, "internal error: misaligned element address");
        const i = abs / this.bytesPerElement;
        const all = this.ensureAllView() as any;
        all[i] = value;
    }

    zero_(): void {
        this.assertAlive();
        if (this.byteLength === 0) return;
        this.backingBytes().fill(0);
    }

    uploadToGPU(ctx: { device: GPUDevice; queue: GPUQueue; readback?: ReadbackRing }, desc: Omit<StorageBufferDescriptor, "byteLength" | "data"> = {}): GPUndarray {
        const bytes = this.backingBytes();
        const sb = new StorageBuffer(ctx.device, ctx.queue, {
            label: desc.label,
            byteLength: this.byteLength,
            data: bytes,
            copyDst: desc.copyDst,
            copySrc: (desc as any).copySrc,
            usage: desc.usage
        });
        return new GPUndarray(this.dtype, this.shape.slice(), this.stridesBytes.slice(), this.offsetBytes, this.byteLength, sb, 0, true, ctx.readback ?? null);
    }

    destroy(): void {
        if (this._destroyed) return;
        const ndim = this.ndim >>> 0;
        if (this._basePtrBytes) wasm.freeBytes(this._basePtrBytes, this.byteLength >>> 0);
        if (this._stridesPtr) wasm.freeU32(this._stridesPtr, ndim);
        if (this._shapePtr) wasm.freeU32(this._shapePtr, ndim);
        this._destroyed = true;
        this._basePtrBytes = 0;
        this._shapePtr = 0;
        this._stridesPtr = 0;
        this._buf = null;
        this._all = null;
    }
}

export class GPUndarray extends Ndarray {
    readonly buffer: StorageBuffer;
    readonly baseOffsetBytes: number;
    private readonly owned: boolean;
    private readonly readback: ReadbackRing | null;

    constructor(dtype: DType, shape: number[], stridesBytes: number[], offsetBytes: number, byteLength: number, buffer: StorageBuffer, baseOffsetBytes: number = 0, owned: boolean = false, readback: ReadbackRing | null = null) {
        super(dtype, shape, stridesBytes, offsetBytes, byteLength);
        assert(Number.isInteger(baseOffsetBytes) && baseOffsetBytes >= 0, `baseOffsetBytes must be an integer >= 0 (got ${baseOffsetBytes})`);
        assert((baseOffsetBytes & 3) === 0, `baseOffsetBytes must be 4-byte aligned for storage buffers (got ${baseOffsetBytes})`);
        this.buffer = buffer;
        this.baseOffsetBytes = baseOffsetBytes;
        this.owned = owned;
        this.readback = readback;
    }

    static empty(ctx: { device: GPUDevice; queue: GPUQueue; readback?: ReadbackRing }, dtype: DType, layout: NdLayoutDescriptor, desc: Omit<StorageBufferDescriptor, "byteLength" | "data"> = {}): GPUndarray {
        const info = dtypeInfo(dtype);
        const shape = validateShape(layout.shape);
        const offsetBytes = validateOffsetBytes(layout.offsetBytes, info.bytesPerElement);
        const stridesBytes = layout.stridesBytes ? validateStridesBytes(layout.stridesBytes, shape.length, info.bytesPerElement) : defaultRowMajorStridesBytes(shape, info.bytesPerElement);
        const byteLength = requiredBackingBytes(shape, stridesBytes, offsetBytes, info.bytesPerElement);
        const sb = new StorageBuffer(ctx.device, ctx.queue, {
            label: desc.label,
            byteLength,
            copyDst: desc.copyDst,
            copySrc: (desc as any).copySrc,
            usage: desc.usage
        });
        return new GPUndarray(dtype, shape, stridesBytes, offsetBytes, byteLength, sb, 0, true, ctx.readback ?? null);
    }

    static wrap(buffer: StorageBuffer, dtype: DType, layout: NdLayoutDescriptor, baseOffsetBytes: number = 0): GPUndarray {
        const info = dtypeInfo(dtype);
        const shape = validateShape(layout.shape);
        const offsetBytes = validateOffsetBytes(layout.offsetBytes, info.bytesPerElement);
        const stridesBytes = layout.stridesBytes ? validateStridesBytes(layout.stridesBytes, shape.length, info.bytesPerElement) : defaultRowMajorStridesBytes(shape, info.bytesPerElement);
        const byteLength = requiredBackingBytes(shape, stridesBytes, offsetBytes, info.bytesPerElement);
        return new GPUndarray(dtype, shape, stridesBytes, offsetBytes, byteLength, buffer, baseOffsetBytes, false);
    }

    get residency(): NdarrayResidency {
        return "gpu-storagebuffer";
    }

    bindingResource(): { buffer: StorageBuffer; offset: number; size: number } {
        return { buffer: this.buffer, offset: this.baseOffsetBytes, size: alignTo(this.byteLength, 4) };
    }

    async readbackToCPU(): Promise<CPUndarray> {
        assert(this.buffer.canReadback, "GPUndarray.readbackToCPU() requires the underlying StorageBuffer to be created with copySrc: true");
        const cpu = CPUndarray.empty(this.dtype, { shape: this.shape, stridesBytes: this.stridesBytes, offsetBytes: this.offsetBytes });
        try {
            if (this.readback && !this.readback.isDestroyed) {
                await this.readback.readIntoWasmMemory(wasm.memory(), cpu.basePtrBytes, this.buffer, this.baseOffsetBytes, this.byteLength, { label: "GPUndarray:readbackToCPU" });
            } else {
                const bytes = await this.buffer.read(this.baseOffsetBytes, this.byteLength);
                cpu.backingBytes().set(new Uint8Array(bytes), 0);
            }
            return cpu;
        } catch (error) { cpu.destroy(); throw error; }
    }

    destroy(): void {
        if (this.owned) this.buffer.destroy();
    }
}
