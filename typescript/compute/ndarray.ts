/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { alignTo, assert } from "../utils";
import { StorageBuffer, validateStorageBufferRange, wrapStorageBuffer, type StorageBufferDescriptor } from "./buffer";
import { ComputePipeline } from "./pipeline";
import { encodeDispatchBatchWithLimit, type ComputeDispatchCommand } from "./dispatch";
import { workgroupsFolded } from "./workgroups";
import { storageBufferLayout } from "../wgsl";
import { ndarrayf, wasm, type WasmPtr } from "../wasm";
import type { ReadbackRing } from "./readback";
import { ScratchAllocator } from "./scratch";
import ndarrayWGSL from "../../wgsl/compute/ndarray.wgsl";

export type DType = "i8" | "u8" | "i16" | "u16" | "i32" | "u32" | "f32" | "f64";

export type NdarrayResidency = "cpu" | "gpu";

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

const validateShape = (shape: ReadonlyArray<number>, prefix: string = ""): number[] => {
    assert(Array.isArray(shape), `${prefix}shape must be an array of dimension sizes`);
    const out: number[] = new Array(shape.length);
    for (let i = 0; i < shape.length; i++) {
        const d = shape[i] as number;
        assert(Number.isInteger(d) && d >= 0, `${prefix}shape[${i}] must be an integer >= 0 (got ${d})`);
        assert(d <= 0xFFFFFFFF, `${prefix}shape[${i}] must fit in u32 (got ${d})`);
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

const validateStridesBytes = (stridesBytes: ReadonlyArray<number>, ndim: number, bytesPerElement: number, prefix: string = ""): number[] => {
    assert(Array.isArray(stridesBytes), `${prefix}stridesBytes must be an array`);
    assert(stridesBytes.length === ndim, `${prefix}stridesBytes length (${stridesBytes.length}) must equal shape length (${ndim})`);
    const out: number[] = new Array(ndim);
    for (let i = 0; i < ndim; i++) {
        const s = stridesBytes[i] as number;
        assert(Number.isInteger(s), `${prefix}stridesBytes[${i}] must be an integer (got ${s})`);
        assert(s >= -0x80000000 && s <= 0x7FFFFFFF, `${prefix}stridesBytes[${i}] must fit in i32 (got ${s})`);
        assert((s % bytesPerElement) === 0, `${prefix}stridesBytes[${i}] (${s}) must be a multiple of bytesPerElement (${bytesPerElement})`);
        out[i] = s === 0 ? 0 : s;
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

const isContiguousRowMajor = (shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>, bytesPerElement: number): boolean => {
    if (numelFromShape(shape) === 0) return true;
    let expected = bytesPerElement;
    for (let i = shape.length - 1; i >= 0; i--) {
        const dim = shape[i]!;
        if (dim !== 1 && stridesBytes[i] !== expected) return false;
        expected *= dim;
    }
    return true;
};

const DTYPE_CODE: Record<DType, number> = { i8: 0, u8: 1, i16: 2, u16: 3, i32: 4, u32: 5, f32: 6, f64: 7 };

const INTEGER_RANGE: Record<DType, readonly [number, number] | null> = { i8: [-128, 127], u8: [0, 255], i16: [-32768, 32767], u16: [0, 65535], i32: [-2147483648, 2147483647], u32: [0, 4294967295], f32: null, f64: null };

const isFloatDType = (dtype: DType): boolean => dtype === "f32" || dtype === "f64";

const sameShape = (a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean => a.length === b.length && a.every((dim, i) => dim === b[i]);

const normalizeAxis = (axis: number, ndim: number, op: string): number => {
    assert(Number.isInteger(axis), `${op}: axis must be an integer (got ${axis})`);
    assert(axis >= -ndim && axis < ndim, `${op}: axis ${axis} is out of bounds for ${ndim} dimensions`);
    return axis < 0 ? axis + ndim : axis;
};

const normalizeAxes = (axes: number | ReadonlyArray<number>, ndim: number, op: string): number[] => {
    const list = typeof axes === "number" ? [axes] : axes;
    assert(Array.isArray(list), `${op}: axes must be an integer or an array of integers`);
    const out = list.map((axis) => normalizeAxis(axis, ndim, op));
    assert(new Set(out).size === out.length, `${op}: axes must be distinct`);
    return out;
};

const byteExtent = (shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>, offsetBytes: number): { min: number; max: number } | null => {
    if (numelFromShape(shape) === 0) return null;
    let min = offsetBytes;
    let max = offsetBytes;
    for (let i = 0; i < shape.length; i++) {
        const extent = (shape[i]! - 1) * stridesBytes[i]!;
        if (extent < 0) min += extent;
        else max += extent;
    }
    return { min, max };
};

const forEachElementOffset = (shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>, offsetBytes: number, visit: (offsetBytes: number) => void): void => {
    if (numelFromShape(shape) === 0) return;
    const ndim = shape.length;
    const index = new Array<number>(ndim).fill(0);
    let off = offsetBytes;
    while (true) {
        visit(off);
        let d = ndim - 1;
        for (; d >= 0; d--) {
            index[d]!++;
            off += stridesBytes[d]!;
            if (index[d]! < shape[d]!) break;
            off -= stridesBytes[d]! * shape[d]!;
            index[d] = 0;
        }
        if (d < 0) return;
    }
};

export type NdarraySliceRange = readonly [start?: number | null, stop?: number | null, step?: number | null];

export type NdarraySliceEntry = null | number | NdarraySliceRange;

const sliceInteger = (value: number | null | undefined, label: string, op: string): number | null => {
    if (value === null || value === undefined) return null;
    assert(Number.isInteger(value), `${op}: ${label} must be an integer or null (got ${value})`);
    return value;
};

const sliceIndices = (n: number, entry: NdarraySliceRange, axis: number, op: string): { start: number; length: number; step: number } => {
    assert(entry.length <= 3, `${op}: the slice for axis ${axis} must be [start, stop, step] (got ${entry.length} entries)`);
    const step = sliceInteger(entry[2], `step for axis ${axis}`, op) ?? 1;
    assert(step !== 0, `${op}: step for axis ${axis} must be nonzero`);
    let start = sliceInteger(entry[0], `start for axis ${axis}`, op);
    let stop = sliceInteger(entry[1], `stop for axis ${axis}`, op);
    if (step > 0) {
        start = (start === null) ? 0 : (start < 0) ? Math.max(start + n, 0) : Math.min(start, n);
        stop = (stop === null) ? n : (stop < 0) ? Math.max(stop + n, 0) : Math.min(stop, n);
    } else {
        start = (start === null) ? n - 1 : (start < 0) ? Math.max(start + n, -1) : Math.min(start, n - 1);
        stop = (stop === null) ? -1 : (stop < 0) ? Math.max(stop + n, -1) : Math.min(stop, n - 1);
    }
    return { start, length: Math.max(0, Math.ceil((stop - start) / step)), step };
};

const nocopyReshapeStrides = (oldShape: ReadonlyArray<number>, oldStrides: ReadonlyArray<number>, newShape: ReadonlyArray<number>, bytesPerElement: number): number[] | null => {
    const oldDims: number[] = [];
    const oldSteps: number[] = [];
    for (let i = 0; i < oldShape.length; i++) if (oldShape[i] !== 1) { oldDims.push(oldShape[i]!); oldSteps.push(oldStrides[i]!); }
    const newnd = newShape.length;
    const oldnd = oldDims.length;
    const newStrides = new Array<number>(newnd).fill(0);
    let oi = 0, oj = 1, ni = 0, nj = 1;
    while (ni < newnd && oi < oldnd) {
        let np = newShape[ni]!;
        let op = oldDims[oi]!;
        while (np !== op) {
            if (np < op) np *= newShape[nj++]!;
            else op *= oldDims[oj++]!;
        }
        for (let ok = oi; ok < oj - 1; ok++) if (oldSteps[ok] !== oldDims[ok + 1]! * oldSteps[ok + 1]!) return null;
        newStrides[nj - 1] = oldSteps[oj - 1]!;
        for (let nk = nj - 1; nk > ni; nk--) newStrides[nk - 1] = newStrides[nk]! * newShape[nk]!;
        ni = nj++;
        oi = oj++;
    }
    const last = (ni >= 1) ? newStrides[ni - 1]! : bytesPerElement;
    for (let nk = ni; nk < newnd; nk++) newStrides[nk] = last;
    return newStrides;
};

const broadcastStrides = (shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>, target: ReadonlyArray<number>, op: string): number[] => {
    const lead = target.length - shape.length;
    assert(lead >= 0, `${op}: cannot broadcast shape [${shape}] to [${target}]`);
    const out = new Array<number>(target.length);
    for (let i = 0; i < target.length; i++) {
        if (i < lead) { out[i] = 0; continue; }
        const dim = shape[i - lead]!;
        if (dim === target[i]) out[i] = stridesBytes[i - lead]!;
        else { assert(dim === 1, `${op}: cannot broadcast shape [${shape}] to [${target}]`); out[i] = 0; }
    }
    return out;
};

type CoalescedLayout = { shape: number[]; strides: number[][]; axes: number[] };

const coalesceDims = (shape: ReadonlyArray<number>, strides: ReadonlyArray<ReadonlyArray<number>>, keep: ReadonlyArray<boolean> = []): CoalescedLayout => {
    const outShape: number[] = [];
    const outStrides: number[][] = strides.map(() => []);
    const axes = new Array<number>(shape.length).fill(-1);
    let lastKept = true;
    for (let d = 0; d < shape.length; d++) {
        const n = shape[d]!;
        const kept = keep[d] === true;
        if (n === 1 && !kept) continue;
        const last = outShape.length - 1;
        if (!kept && !lastKept && strides.every((s, k) => outStrides[k]![last] === s[d]! * n)) {
            outShape[last]! *= n;
            for (let k = 0; k < strides.length; k++) outStrides[k]![last] = strides[k]![d]!;
        } else {
            outShape.push(n);
            for (let k = 0; k < strides.length; k++) outStrides[k]!.push(strides[k]![d]!);
            lastKept = kept;
        }
        if (kept) axes[d] = outShape.length - 1;
    }
    return { shape: outShape, strides: outStrides, axes };
};

const mayAddressTwice = (shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>, bytesPerElement: number): boolean => {
    const dims: Array<readonly [number, number]> = [];
    for (let i = 0; i < shape.length; i++) {
        if (shape[i]! <= 1) continue;
        if (stridesBytes[i] === 0) return true;
        dims.push([Math.abs(stridesBytes[i]!), shape[i]!]);
    }
    dims.sort((a, b) => a[0] - b[0]);
    let extent = bytesPerElement;
    for (const [stride, dim] of dims) {
        if (stride < extent) return true;
        extent += (dim - 1) * stride;
    }
    return false;
};

export type NdarrayPadMode = "constant" | "edge" | "reflect" | "symmetric" | "wrap";

const PAD_MODE_CODE: Record<NdarrayPadMode, number> = { constant: 0, edge: 1, reflect: 2, symmetric: 3, wrap: 4 };

const modFloor = (i: number, p: number): number => ((i % p) + p) % p;

const padSourceIndex = (i: number, n: number, mode: NdarrayPadMode): number => {
    if (i >= 0 && i < n) return i;
    if (mode === "constant") return -1;
    if (mode === "edge") return (i < 0) ? 0 : n - 1;
    if (mode === "wrap") return modFloor(i, n);
    if (mode === "symmetric") { const p = 2 * n, j = modFloor(i, p); return (j < n) ? j : p - 1 - j; }
    if (n === 1) return 0;
    const p = 2 * n - 2, j = modFloor(i, p);
    return (j < n) ? j : p - j;
};

const ndarrayBase = Symbol("Ndarray.base");
const ndarrayView = Symbol("Ndarray.view");
const ndarrayAssertAlive = Symbol("Ndarray.assertAlive");

const placeView = (parent: Ndarray, shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>, offsetBytes: number, granularity: number): { offsetBytes: number; byteLength: number; shiftBytes: number } => {
    const extent = byteExtent(shape, stridesBytes, offsetBytes);
    if (!extent) return { offsetBytes: 0, byteLength: 0, shiftBytes: 0 };
    assert(extent.min >= 0 && extent.max + parent.bytesPerElement <= parent.byteLength, "internal error: ndarray view escapes its base storage");
    const shiftBytes = extent.min - (extent.min % granularity);
    return { offsetBytes: offsetBytes - shiftBytes, byteLength: extent.max + parent.bytesPerElement - shiftBytes, shiftBytes };
};

export abstract class Ndarray {
    readonly dtype: DType;
    readonly shape: number[];
    readonly stridesBytes: number[];
    readonly offsetBytes: number;
    readonly bytesPerElement: number;
    readonly numel: number;
    readonly byteLength: number;
    [ndarrayBase]: Ndarray | null = null;

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
        return isContiguousRowMajor(this.shape, this.stridesBytes, this.bytesPerElement);
    }

    get base(): Ndarray | null {
        return this[ndarrayBase];
    }

    layout(): { shape: number[]; stridesBytes: number[]; offsetBytes: number } {
        return { shape: this.shape.slice(), stridesBytes: this.stridesBytes.slice(), offsetBytes: this.offsetBytes };
    }

    abstract get residency(): NdarrayResidency;

    abstract destroy(): void;

    abstract [ndarrayAssertAlive](): void;

    abstract [ndarrayView](shape: number[], stridesBytes: number[], offsetBytes: number): Ndarray;
}

export class CPUndarray extends Ndarray {
    private _basePtrBytes: WasmPtr;
    private _shapePtr: WasmPtr;
    private _stridesPtr: WasmPtr;
    private _pointers: boolean;
    private _pointerLength: number;
    private _destroyed: boolean = false;
    private _buf: ArrayBuffer | null = null;
    private _all: NumberTypedArray | null = null;

    private constructor(dtype: DType, shape: number[], stridesBytes: number[], offsetBytes: number, byteLength: number, basePtrBytes: WasmPtr, shapePtr: WasmPtr, stridesPtr: WasmPtr, pointers: boolean) {
        super(dtype, shape, stridesBytes, offsetBytes, byteLength);
        this._basePtrBytes = basePtrBytes;
        this._shapePtr = shapePtr;
        this._stridesPtr = stridesPtr;
        this._pointers = pointers;
        this._pointerLength = pointers ? shape.length >>> 0 : 0;
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
            return new CPUndarray(dtype, shape, stridesBytes, offsetBytes, byteLength, basePtrBytes, shapePtr, stridesPtr, true);
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
        return "cpu";
    }

    get destroyed(): boolean {
        const root = this[ndarrayBase] as CPUndarray | null;
        return this._destroyed || (root !== null && root._destroyed);
    }

    get basePtrBytes(): WasmPtr {
        this.assertAlive();
        return this._basePtrBytes;
    }

    get shapePtr(): WasmPtr {
        this.assertAlive();
        this.ensurePointers();
        return this._shapePtr;
    }

    get stridesPtr(): WasmPtr {
        this.assertAlive();
        this.ensurePointers();
        return this._stridesPtr;
    }

    private assertAlive(): void {
        assert(!this.destroyed, "CPUndarray has been destroyed");
    }

    [ndarrayAssertAlive](): void {
        this.assertAlive();
    }

    private ensurePointers(): void {
        if (this._pointers) return;
        const ndim = this.ndim >>> 0;
        let shapePtr = 0;
        let stridesPtr = 0;
        try {
            shapePtr = wasm.allocU32(ndim);
            assert(shapePtr !== 0 || ndim === 0, `CPUndarray: shape allocation failed (${ndim} elements)`);
            stridesPtr = wasm.allocU32(ndim);
            assert(stridesPtr !== 0 || ndim === 0, `CPUndarray: strides allocation failed (${ndim} elements)`);
            const shapeView = wasm.u32view(shapePtr, ndim);
            for (let i = 0; i < ndim; i++) shapeView[i] = this.shape[i]! >>> 0;
            const strideView = wasm.i32view(stridesPtr, ndim);
            for (let i = 0; i < ndim; i++) strideView[i] = this.stridesBytes[i]! | 0;
        } catch (error) {
            if (stridesPtr) wasm.freeU32(stridesPtr, ndim);
            if (shapePtr) wasm.freeU32(shapePtr, ndim);
            throw error;
        }
        this._shapePtr = shapePtr;
        this._stridesPtr = stridesPtr;
        this._pointerLength = ndim;
        this._pointers = true;
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
        const bytes = this.backingBytes();
        if (this[ndarrayBase] === null) { bytes.fill(0); return; }
        if (this.isContiguousC) { bytes.fill(0, this.offsetBytes, this.offsetBytes + this.numel * this.bytesPerElement); return; }
        forEachElementOffset(this.shape, this.stridesBytes, this.offsetBytes, (off) => bytes.fill(0, off, off + this.bytesPerElement));
    }

    [ndarrayView](shape: number[], stridesBytes: number[], offsetBytes: number): CPUndarray {
        this.assertAlive();
        const place = placeView(this, shape, stridesBytes, offsetBytes, 1);
        const view = new CPUndarray(this.dtype, shape, stridesBytes, place.offsetBytes, place.byteLength, (this._basePtrBytes + place.shiftBytes) >>> 0, 0, 0, false);
        view[ndarrayBase] = this[ndarrayBase] ?? this;
        return view;
    }

    destroy(): void {
        if (this._destroyed) return;
        if (this[ndarrayBase] === null && this._basePtrBytes) wasm.freeBytes(this._basePtrBytes, this.byteLength >>> 0);
        if (this._pointers) {
            if (this._stridesPtr) wasm.freeU32(this._stridesPtr, this._pointerLength);
            if (this._shapePtr) wasm.freeU32(this._shapePtr, this._pointerLength);
        }
        this._destroyed = true;
        this._basePtrBytes = 0;
        this._shapePtr = 0;
        this._stridesPtr = 0;
        this._pointers = false;
        this._buf = null;
        this._all = null;
    }
}

export class GPUndarray extends Ndarray {
    readonly buffer: StorageBuffer;
    readonly baseOffsetBytes: number;
    private readonly owned: boolean;
    private _destroyed: boolean = false;

    constructor(dtype: DType, shape: number[], stridesBytes: number[], offsetBytes: number, byteLength: number, buffer: StorageBuffer, baseOffsetBytes: number = 0, owned: boolean = false) {
        super(dtype, shape, stridesBytes, offsetBytes, byteLength);
        assert(Number.isSafeInteger(baseOffsetBytes) && baseOffsetBytes >= 0, `baseOffsetBytes must be a safe integer >= 0 (got ${baseOffsetBytes})`);
        assert((baseOffsetBytes & 3) === 0, `baseOffsetBytes must be 4-byte aligned for storage buffers (got ${baseOffsetBytes})`);
        validateStorageBufferRange(buffer, baseOffsetBytes, byteLength);
        this.buffer = buffer;
        this.baseOffsetBytes = baseOffsetBytes;
        this.owned = owned;
    }

    static empty(ctx: { device: GPUDevice; queue: GPUQueue }, dtype: DType, layout: NdLayoutDescriptor, desc: Omit<StorageBufferDescriptor, "byteLength" | "data"> = {}): GPUndarray {
        const info = dtypeInfo(dtype);
        const shape = validateShape(layout.shape);
        const offsetBytes = validateOffsetBytes(layout.offsetBytes, info.bytesPerElement);
        const stridesBytes = layout.stridesBytes ? validateStridesBytes(layout.stridesBytes, shape.length, info.bytesPerElement) : defaultRowMajorStridesBytes(shape, info.bytesPerElement);
        const byteLength = requiredBackingBytes(shape, stridesBytes, offsetBytes, info.bytesPerElement);
        const sb = new StorageBuffer(ctx.device, ctx.queue, {
            label: desc.label,
            byteLength,
            copyDst: desc.copyDst,
            copySrc: desc.copySrc,
            usage: desc.usage
        });
        return new GPUndarray(dtype, shape, stridesBytes, offsetBytes, byteLength, sb, 0, true);
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
        return "gpu";
    }

    private assertAlive(): void {
        const root = this[ndarrayBase] as GPUndarray | null;
        assert(!this._destroyed && !(root !== null && root._destroyed), "GPUndarray has been destroyed");
    }

    [ndarrayAssertAlive](): void {
        this.assertAlive();
        validateStorageBufferRange(this.buffer, this.baseOffsetBytes, this.byteLength);
    }

    bindingResource(): { buffer: StorageBuffer; offset: number; size: number } {
        this.assertAlive();
        validateStorageBufferRange(this.buffer, this.baseOffsetBytes, this.byteLength, true);
        assert((this.buffer.offsetBytes + this.baseOffsetBytes) % this.buffer.device.limits.minStorageBufferOffsetAlignment === 0, "GPUndarray binding offset must satisfy minStorageBufferOffsetAlignment");
        return { buffer: this.buffer, offset: this.baseOffsetBytes, size: alignTo(this.byteLength, 4) };
    }

    [ndarrayView](shape: number[], stridesBytes: number[], offsetBytes: number): GPUndarray {
        this[ndarrayAssertAlive]();
        const place = placeView(this, shape, stridesBytes, offsetBytes, 4);
        const view = new GPUndarray(this.dtype, shape, stridesBytes, place.offsetBytes, place.byteLength, this.buffer, this.baseOffsetBytes + place.shiftBytes, false);
        view[ndarrayBase] = this[ndarrayBase] ?? this;
        return view;
    }

    destroy(): void {
        if (this._destroyed) return;
        this._destroyed = true;
        if (this.owned) this.buffer.destroy();
    }
}

export type NdarrayGPUOptions = {
    label?: string;
    copySrc?: boolean;
    copyDst?: boolean;
    usage?: GPUBufferUsageFlags;
};

export type NdarrayCreateOptions = NdarrayGPUOptions & {
    residency?: NdarrayResidency;
};

type AnyNdarray = CPUndarray | GPUndarray;

const opName = (op: string): string => `compute.ndarray.${op}`;

const assertNdarray = (a: unknown, op: string, label: string = "array"): AnyNdarray => { assert(a instanceof CPUndarray || a instanceof GPUndarray, `${opName(op)}: ${label} must be a CPUndarray or GPUndarray`); return a; };

const hasGPUOptions = (options: NdarrayGPUOptions & { encoder?: unknown; out?: unknown }): boolean => options.label !== undefined || options.copySrc !== undefined || options.copyDst !== undefined || options.usage !== undefined || options.encoder !== undefined || options.out !== undefined;

export type NdarrayOperationOptions = NdarrayGPUOptions & {
    encoder?: GPUCommandEncoder;
    out?: GPUndarray;
};

export type NdarrayOverflowMode = "wrap" | "saturate";

export type NdarrayRoundingMode = "trunc" | "nearest-even";

export type NdarrayCastOptions = NdarrayOperationOptions & {
    overflow?: NdarrayOverflowMode;
    rounding?: NdarrayRoundingMode;
};

export type NdarrayCopyIntoOptions = {
    overflow?: NdarrayOverflowMode;
    rounding?: NdarrayRoundingMode;
    encoder?: GPUCommandEncoder;
    label?: string;
};

export type NdarrayPadWidth = number | readonly [number, number] | ReadonlyArray<number | readonly [number, number]>;

export type NdarrayPadOptions = NdarrayOperationOptions & {
    width: NdarrayPadWidth;
    mode?: NdarrayPadMode;
    value?: number;
};

export type NdarrayParameter = number | ArrayLike<number>;

export type NdarrayNormalizeOptions = NdarrayOperationOptions & ({ scale?: NdarrayParameter; offset?: NdarrayParameter; mean?: undefined; std?: undefined } | { mean: NdarrayParameter; std: NdarrayParameter; scale?: undefined; offset?: undefined }) & {
    axis?: number;
    dtype?: DType;
};

export type NdarrayResizeMethod = "nearest" | "linear";

export type NdarrayResizeOptions = NdarrayOperationOptions & {
    axes: readonly [number, number];
    size: readonly [number, number];
    method?: NdarrayResizeMethod;
    alignCorners?: boolean;
    boundary?: NdarrayPadMode;
    value?: number;
    dtype?: DType;
};

type IntMode = { saturate: boolean; nearest: boolean };

const ARITHMETIC_MODE: IntMode = { saturate: true, nearest: true };

const resolveIntMode = (src: DType, options: { overflow?: NdarrayOverflowMode; rounding?: NdarrayRoundingMode }, op: string): IntMode => {
    assert(options.overflow === undefined || options.overflow === "wrap" || options.overflow === "saturate", `${opName(op)}: overflow must be "wrap" or "saturate" (got ${String(options.overflow)})`);
    assert(options.rounding === undefined || options.rounding === "trunc" || options.rounding === "nearest-even", `${opName(op)}: rounding must be "trunc" or "nearest-even" (got ${String(options.rounding)})`);
    return { saturate: (options.overflow ?? (isFloatDType(src) ? "saturate" : "wrap")) === "saturate", nearest: options.rounding === "nearest-even" };
};

const elementBits = (dtype: DType, value: number): Uint32Array => {
    const buffer = new ArrayBuffer(8);
    new (dtypeInfo(dtype).ctor)(buffer)[0] = value;
    return new Uint32Array(buffer);
};

const validateElementValue = (dtype: DType, value: number, op: string): void => {
    assert(typeof value === "number", `${opName(op)}: value must be a number (got ${String(value)})`);
    const range = INTEGER_RANGE[dtype];
    if (range) assert(Number.isInteger(value) && value >= range[0] && value <= range[1], `${opName(op)}: value ${value} is not exactly representable as ${dtype}`);
};

const rootOf = (a: Ndarray): Ndarray => a[ndarrayBase] ?? a;

const CPU_MAX_RANK = 64;

const GPU_MAX_RANK = 8;

const WASM_STATUS: ReadonlyArray<string> = ["ok", "invalid dtype code", "invalid mode code", "invalid rank", "invalid pointer", "overlapping source and destination ranges", "source layout out of bounds", "destination layout out of bounds", "invalid shape", "invalid tap table", "invalid parameters"];

const checkWasmStatus = (status: number, op: string): void => {
    assert(status === 0, `${opName(op)}: the WebAssembly kernel rejected the request (status ${status}: ${WASM_STATUS[status] ?? "unknown"})`);
};

class WasmScratch {
    private readonly releases: Array<() => void> = [];

    u32(values: ArrayLike<number>): WasmPtr {
        const n = Math.max(values.length, 1);
        const ptr = wasm.allocU32(n);
        assert(ptr !== 0, `compute.ndarray: WebAssembly scratch allocation failed (${n} u32 words)`);
        this.releases.push(() => wasm.freeU32(ptr, n));
        const view = wasm.u32view(ptr, values.length);
        for (let i = 0; i < values.length; i++) view[i] = values[i]! >>> 0;
        return ptr;
    }

    f64(values: ArrayLike<number>): WasmPtr {
        const n = Math.max(values.length, 1);
        const ptr = wasm.allocF64(n);
        assert(ptr !== 0, `compute.ndarray: WebAssembly scratch allocation failed (${n} f64 values)`);
        this.releases.push(() => wasm.freeF64(ptr, n));
        wasm.f64view(ptr, values.length).set(Array.from(values));
        return ptr;
    }

    release(): void {
        for (const release of this.releases.splice(0)) release();
    }
}

const withWasmScratch = <T>(run: (scratch: WasmScratch) => T): T => {
    const scratch = new WasmScratch();
    try { return run(scratch); }
    finally { scratch.release(); }
};

const assertRank = (rank: number, limit: number, backend: string, op: string): void => {
    assert(rank <= limit, `${opName(op)}: ${backend} operations support at most ${limit} dimensions after coalescing (got ${rank})`);
};

const cpuCopy = (dst: CPUndarray, src: CPUndarray, srcStrides: ReadonlyArray<number>, mode: IntMode, op: string): void => {
    if (dst.numel === 0) return;
    const c = coalesceDims(dst.shape, [srcStrides, dst.stridesBytes]);
    assertRank(c.shape.length, CPU_MAX_RANK, "CPU", op);
    const codes = DTYPE_CODE[dst.dtype] | (DTYPE_CODE[src.dtype] << 4) | (mode.saturate ? 0x100 : 0) | (mode.nearest ? 0x200 : 0);
    withWasmScratch((scratch) => {
        const layout = scratch.u32([dst.offsetBytes, src.offsetBytes, ...c.shape, ...c.strides[0]!, ...c.strides[1]!]);
        checkWasmStatus(ndarrayf.copy(dst.basePtrBytes, dst.byteLength, src.basePtrBytes, src.byteLength, layout, c.shape.length, codes), op);
    });
};

const cpuMayOverlap = (a: CPUndarray, b: CPUndarray): boolean => {
    if (rootOf(a) !== rootOf(b) || a.byteLength === 0 || b.byteLength === 0) return false;
    return a.basePtrBytes < b.basePtrBytes + b.byteLength && b.basePtrBytes < a.basePtrBytes + a.byteLength;
};

const cpuPad = (dst: CPUndarray, src: CPUndarray, before: ReadonlyArray<number>, keep: ReadonlyArray<boolean>, mode: NdarrayPadMode, bits: Uint32Array, op: string): void => {
    if (dst.numel === 0) return;
    const c = coalesceDims(dst.shape, [src.stridesBytes, dst.stridesBytes], keep);
    assertRank(c.shape.length, CPU_MAX_RANK, "CPU", op);
    const kept = new Map(c.axes.flatMap((index, axis) => (index >= 0) ? [[index, axis] as const] : []));
    const srcShape = c.shape.map((n, i) => kept.has(i) ? src.shape[kept.get(i)!]! : n);
    const lead = c.shape.map((_, i) => kept.has(i) ? before[kept.get(i)!]! : 0);
    withWasmScratch((scratch) => {
        const layout = scratch.u32([dst.offsetBytes, src.offsetBytes, ...c.shape, ...srcShape, ...lead, ...c.strides[0]!, ...c.strides[1]!]);
        const value = scratch.u32(bits);
        const srcLength = src.numel === 0 ? 0 : src.byteLength;
        checkWasmStatus(ndarrayf.pad(dst.basePtrBytes, dst.byteLength, srcLength === 0 ? 0 : src.basePtrBytes, srcLength, layout, c.shape.length, DTYPE_CODE[dst.dtype] | (PAD_MODE_CODE[mode] << 8), value), op);
    });
};

const cpuAffine = (dst: CPUndarray, src: CPUndarray, axis: number, a: ReadonlyArray<number>, b: ReadonlyArray<number>, meanStd: boolean, op: string): void => {
    if (dst.numel === 0) return;
    const keep = dst.shape.map((_, i) => i === axis && a.length > 1);
    const c = coalesceDims(dst.shape, [src.stridesBytes, dst.stridesBytes], keep);
    assertRank(c.shape.length, CPU_MAX_RANK, "CPU", op);
    const coalescedAxis = (axis >= 0 && a.length > 1) ? c.axes[axis]! : 0xFFFFFFFF;
    withWasmScratch((scratch) => {
        const layout = scratch.u32([dst.offsetBytes, src.offsetBytes, coalescedAxis, a.length, ...c.shape, ...c.strides[0]!, ...c.strides[1]!]);
        const params = scratch.f64([...a, ...b]);
        checkWasmStatus(ndarrayf.affine(dst.basePtrBytes, dst.byteLength, src.basePtrBytes, src.byteLength, layout, c.shape.length, DTYPE_CODE[dst.dtype] | (DTYPE_CODE[src.dtype] << 4) | (meanStd ? 0x100 : 0), params), op);
    });
};

type ResizeTable = { i0: Int32Array; i1: Int32Array; w0: Float64Array; w1: Float64Array };

const cpuResize = (dst: CPUndarray, src: CPUndarray, axes: readonly [number, number], tables: readonly [ResizeTable, ResizeTable], linear: boolean, value: number, op: string): void => {
    if (dst.numel === 0) return;
    const keep = dst.shape.map((_, i) => i === axes[0] || i === axes[1]);
    const c = coalesceDims(dst.shape, [src.stridesBytes, dst.stridesBytes], keep);
    assertRank(c.shape.length, CPU_MAX_RANK, "CPU", op);
    const [ty, tx] = tables;
    withWasmScratch((scratch) => {
        const layout = scratch.u32([dst.offsetBytes, src.offsetBytes, c.axes[axes[0]]!, c.axes[axes[1]]!, src.shape[axes[0]]!, src.shape[axes[1]]!, ...c.shape, ...c.strides[0]!, ...c.strides[1]!]);
        const index = scratch.u32([...ty.i0, ...ty.i1, ...tx.i0, ...tx.i1]);
        const weight = scratch.f64([...ty.w0, ...ty.w1, ...tx.w0, ...tx.w1, value]);
        const srcLength = src.numel === 0 ? 0 : src.byteLength;
        checkWasmStatus(ndarrayf.resize(dst.basePtrBytes, dst.byteLength, srcLength === 0 ? 0 : src.basePtrBytes, srcLength, layout, c.shape.length, DTYPE_CODE[dst.dtype] | (DTYPE_CODE[src.dtype] << 4) | (linear ? 0x100 : 0), index, weight), op);
    });
};

const buildResizeTable = (nIn: number, nOut: number, method: NdarrayResizeMethod, alignCorners: boolean, boundary: NdarrayPadMode): ResizeTable => {
    const table: ResizeTable = { i0: new Int32Array(nOut), i1: new Int32Array(nOut), w0: new Float64Array(nOut), w1: new Float64Array(nOut) };
    for (let d = 0; d < nOut; d++) {
        if (method === "nearest") {
            const product = (2 * d + 1) * nIn, divisor = 2 * nOut;
            const quotient = Math.floor(product / divisor);
            const index = Number.isSafeInteger(product) ? ((quotient * divisor > product) ? quotient - 1 : quotient) : Number((BigInt(2 * d + 1) * BigInt(nIn)) / BigInt(divisor));
            table.i0[d] = table.i1[d] = Math.min(index, nIn - 1);
            table.w0[d] = 1;
            continue;
        }
        const src = alignCorners ? ((nOut === 1) ? 0 : d * (nIn - 1) / (nOut - 1)) : (d + 0.5) * nIn / nOut - 0.5;
        const i0 = Math.floor(src);
        const w1 = src - i0;
        const i1 = (w1 === 0) ? i0 : i0 + 1;
        table.i0[d] = padSourceIndex(i0, nIn, boundary);
        table.i1[d] = padSourceIndex(i1, nIn, boundary);
        table.w0[d] = 1 - w1;
        table.w1[d] = w1;
    }
    return table;
};

const P_COUNT = 0, P_NDIM = 1, P_NUMEL = 2, P_SRC_OFFSET = 3, P_DST_OFFSET = 4, P_VALUE_LO = 5, P_VALUE_HI = 6, P_PARAM_AXIS = 7, P_PARAM_LEN = 8, P_AXIS_Y = 9, P_AXIS_X = 10, P_TABLE = 11, P_SHAPE = 16, P_SRC_STRIDE = 24, P_DST_STRIDE = 32, P_SRC_SHAPE = 40, P_BEFORE = 48, P_HEADER_WORDS = 56;

type GPUGather = {
    dst: GPUndarray;
    src: GPUndarray;
    entryPoint: "gather" | "resize";
    constants: Record<string, number>;
    srcStrides: ReadonlyArray<number>;
    keep?: ReadonlyArray<boolean>;
    srcShape?: ReadonlyArray<number>;
    before?: ReadonlyArray<number>;
    paramAxis?: number;
    resizeAxes?: readonly [number, number];
    valueBits?: ArrayLike<number>;
    table?: Uint32Array;
    paramLen?: number;
};

class NdarrayGPUEngine {
    private readonly device: GPUDevice;
    private readonly queue: GPUQueue;
    private readonly scratch: ScratchAllocator;
    private readonly pipelines: Map<string, ComputePipeline> = new Map();
    private empty: StorageBuffer | null = null;

    constructor(device: GPUDevice, queue: GPUQueue, scratch: ScratchAllocator) {
        this.device = device;
        this.queue = queue;
        this.scratch = scratch;
    }

    destroy(): void {
        this.pipelines.clear();
        this.empty = null;
    }

    private pipeline(entryPoint: "gather" | "resize", constants: Record<string, number>): ComputePipeline {
        const key = `${entryPoint}:${Object.keys(constants).sort().map((name) => `${name}=${constants[name]}`).join(",")}`;
        let pipeline = this.pipelines.get(key);
        if (!pipeline) {
            pipeline = new ComputePipeline(this.device, {
                label: `compute.ndarray:${key}`,
                code: ndarrayWGSL,
                entryPoint,
                constants,
                bindGroups: [
                    {
                        label: "compute.ndarray:bg0",
                        entries: [
                            storageBufferLayout({ binding: 0, readOnly: true }),
                            storageBufferLayout({ binding: 1, readOnly: false }),
                            storageBufferLayout({ binding: 2, readOnly: true })
                        ]
                    }
                ]
            });
            this.pipelines.set(key, pipeline);
        }
        return pipeline;
    }

    private binding(a: GPUndarray, op: string): { resource: { buffer: StorageBuffer; offset: number; size: number }; delta: number } {
        if (a.byteLength === 0) {
            this.empty ??= new StorageBuffer(this.device, this.queue, { label: "compute.ndarray:empty", byteLength: 4, copyDst: false });
            return { resource: { buffer: this.empty, offset: 0, size: 4 }, delta: 0 };
        }
        const storage = a.buffer;
        const alignment = this.device.limits.minStorageBufferOffsetAlignment;
        const absolute = storage.offsetBytes + a.baseOffsetBytes;
        const start = absolute - (absolute % alignment);
        const delta = absolute - start;
        const offset = start - storage.offsetBytes;
        const size = alignTo(delta + a.byteLength, 4);
        try { validateStorageBufferRange(storage, offset, delta + a.byteLength, true); }
        catch { throw new Error(`${opName(op)}: the 4-byte-aligned binding range of an array extends past its StorageBuffer's logical range (odd-length external wrappers cannot be bound)`); }
        assert(size <= this.device.limits.maxStorageBufferBindingSize, `${opName(op)}: a ${size}-byte binding exceeds device.limits.maxStorageBufferBindingSize (${this.device.limits.maxStorageBufferBindingSize}); request larger maxStorageBufferBindingSize and maxBufferSize limits through the renderer's device descriptor`);
        return { resource: { buffer: storage, offset, size }, delta };
    }

    output(dtype: DType, shape: ReadonlyArray<number>, options: NdarrayGPUOptions, op: string): GPUndarray {
        const info = dtypeInfo(dtype);
        const bytes = alignTo(numelFromShape(shape) * info.bytesPerElement, 4);
        assert(bytes <= this.device.limits.maxBufferSize, `${opName(op)}: a ${bytes}-byte output exceeds device.limits.maxBufferSize (${this.device.limits.maxBufferSize}); request larger maxStorageBufferBindingSize and maxBufferSize limits through the renderer's device descriptor`);
        return GPUndarray.empty({ device: this.device, queue: this.queue }, dtype, { shape }, { label: options.label ?? opName(op), copySrc: options.copySrc ?? true, copyDst: options.copyDst ?? true, usage: options.usage });
    }

    stage(src: GPUndarray, commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, op: string): GPUndarray {
        const bytes = alignTo(src.numel * src.bytesPerElement, 4);
        const storage = wrapStorageBuffer(this.device, this.queue, this.scratch.acquire(bytes, `${opName(op)}:staging`), { byteLength: bytes });
        const temp = GPUndarray.wrap(storage, src.dtype, { shape: src.shape });
        this.gather(commands, encoder, { dst: temp, src, entryPoint: "gather", constants: castConstants(src.dtype, src.dtype, ARITHMETIC_MODE), srcStrides: src.stridesBytes }, op);
        return temp;
    }

    gather(commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, spec: GPUGather, op: string): void {
        const { dst, src } = spec;
        if (dst.numel === 0) return;
        const c = coalesceDims(dst.shape, [spec.srcStrides, dst.stridesBytes], spec.keep);
        assertRank(c.shape.length, GPU_MAX_RANK, "GPU", op);
        const kept = new Map(c.axes.flatMap((index, axis) => (index >= 0) ? [[index, axis] as const] : []));
        const srcBinding = this.binding(src, op);
        const dstBinding = this.binding(dst, op);
        const size = dst.bytesPerElement;
        const dstOffset = dstBinding.delta + dst.offsetBytes;
        const count = (size < 4) ? Math.floor((dstOffset + dst.numel * size - 1) / 4) - Math.floor(dstOffset / 4) + 1 : dst.numel;
        const table = spec.table ?? new Uint32Array(0);
        const words = new Uint32Array(P_HEADER_WORDS + table.length);
        words[P_COUNT] = count;
        words[P_NDIM] = c.shape.length;
        words[P_NUMEL] = dst.numel;
        words[P_SRC_OFFSET] = srcBinding.delta + src.offsetBytes;
        words[P_DST_OFFSET] = dstOffset;
        words[P_VALUE_LO] = spec.valueBits?.[0] ?? 0;
        words[P_VALUE_HI] = spec.valueBits?.[1] ?? 0;
        words[P_PARAM_AXIS] = (spec.paramAxis !== undefined && spec.paramAxis >= 0) ? c.axes[spec.paramAxis]! : 0xFFFFFFFF;
        words[P_PARAM_LEN] = spec.paramLen ?? 1;
        words[P_AXIS_Y] = spec.resizeAxes ? c.axes[spec.resizeAxes[0]]! : 0;
        words[P_AXIS_X] = spec.resizeAxes ? c.axes[spec.resizeAxes[1]]! : 0;
        words[P_TABLE] = P_HEADER_WORDS;
        for (let i = 0; i < c.shape.length; i++) {
            const axis = kept.get(i);
            words[P_SHAPE + i] = c.shape[i]!;
            words[P_SRC_STRIDE + i] = c.strides[0]![i]! >>> 0;
            words[P_DST_STRIDE + i] = c.strides[1]![i]! >>> 0;
            words[P_SRC_SHAPE + i] = (axis !== undefined && spec.srcShape) ? spec.srcShape[axis]! : c.shape[i]!;
            words[P_BEFORE + i] = (axis !== undefined && spec.before) ? spec.before[axis]! : 0;
        }
        words.set(table, P_HEADER_WORDS);
        const params = this.scratch.params(words, encoder);
        const pipeline = this.pipeline(spec.entryPoint, spec.constants);
        const bindGroup = pipeline.createBindGroup(0, { 0: srcBinding.resource, 1: dstBinding.resource, 2: params }, `${opName(op)}:bg`);
        commands.push({ pipeline, bindGroups: [bindGroup], workgroups: workgroupsFolded(count, 256, this.device.limits.maxComputeWorkgroupsPerDimension), label: opName(op) });
    }

    submit(commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, label: string | undefined, op: string): void {
        const target = encoder ?? this.device.createCommandEncoder({ label: label ?? opName(op) });
        if (commands.length > 0) encodeDispatchBatchWithLimit(target, commands, label ?? opName(op), this.device.limits.maxComputeWorkgroupsPerDimension);
        if (!encoder) this.queue.submit([target.finish()]);
    }
}

const castConstants = (src: DType, dst: DType, mode: IntMode): Record<string, number> => {
    const integerDestination = INTEGER_RANGE[dst] !== null && src !== dst;
    return { SRC_DTYPE: DTYPE_CODE[src], DST_DTYPE: DTYPE_CODE[dst], OPERATION: 0, OVERFLOW: integerDestination && !mode.saturate ? 0 : 1, ROUNDING: integerDestination && mode.nearest ? 1 : 0 };
};

const assertGPUCast = (src: DType, dst: DType, op: string): void => {
    assert(!((src === "f64") !== (dst === "f64") && (INTEGER_RANGE[src] !== null || INTEGER_RANGE[dst] !== null)), `${opName(op)}: f64 <-> integer casts are not supported on the GPU; cast through f32 or use a CPU array`);
};

const assertCPUOptions = (options: NdarrayGPUOptions & { encoder?: unknown; out?: unknown }, op: string): void => {
    assert(!hasGPUOptions(options), `${opName(op)}: GPU options (encoder, out, label, copySrc, copyDst, usage) are not supported for CPU arrays`);
};

const normalizePadWidth = (width: NdarrayPadWidth, ndim: number, op: string): { before: number[]; after: number[] } => {
    const integer = (value: unknown): number => {
        assert(Number.isInteger(value) && (value as number) >= 0, `${opName(op)}: pad widths must be integers >= 0 (got ${String(value)}); use compute.ndarray.slice() to crop`);
        return value as number;
    };
    const pair = (value: unknown): [number, number] => {
        if (typeof value === "number") return [integer(value), integer(value)];
        assert(Array.isArray(value) && value.length === 2, `${opName(op)}: each pad width must be an integer or a [before, after] pair`);
        return [integer(value[0]), integer(value[1])];
    };
    let pairs: Array<[number, number]>;
    if (typeof width === "number") pairs = new Array(ndim).fill(pair(width));
    else if (Array.isArray(width) && width.length === 2 && typeof width[0] === "number" && typeof width[1] === "number") pairs = new Array(ndim).fill(pair(width));
    else {
        assert(Array.isArray(width) && width.length === ndim, `${opName(op)}: width must be an integer, a [before, after] pair, or an array with one entry per axis (${ndim})`);
        pairs = width.map((entry) => pair(entry));
    }
    return { before: pairs.map((p) => p[0]), after: pairs.map((p) => p[1]) };
};

const normalizeParameter = (value: NdarrayParameter, label: string, op: string): number[] => {
    const values = (typeof value === "number") ? [value] : Array.from(value as ArrayLike<number>);
    assert(values.length > 0, `${opName(op)}: ${label} must not be empty`);
    for (const v of values) assert(typeof v === "number" && Number.isFinite(v), `${opName(op)}: ${label} values must be finite numbers (got ${String(v)})`);
    return values;
};

export class NdarrayNamespace {
    private readonly device: GPUDevice;
    private readonly queue: GPUQueue;
    private readonly readback: ReadbackRing | null;
    private readonly scratch: ScratchAllocator;
    private readonly ownsScratch: boolean;
    private readonly gpu: NdarrayGPUEngine;
    private destroyed: boolean = false;

    constructor(device: GPUDevice, queue: GPUQueue, readback: ReadbackRing | null = null, scratch?: ScratchAllocator) {
        this.device = device;
        this.queue = queue;
        this.readback = readback;
        this.scratch = scratch ?? new ScratchAllocator(device, queue);
        this.ownsScratch = !scratch;
        this.gpu = new NdarrayGPUEngine(device, queue, this.scratch);
    }

    [Symbol.hasInstance](value: unknown): value is Ndarray {
        return value instanceof Ndarray;
    }

    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        this.gpu.destroy();
        if (this.ownsScratch) this.scratch.destroy();
    }

    private assertGPUArray(a: GPUndarray, op: string, label: string = "array"): void {
        a[ndarrayAssertAlive]();
        assert(a.buffer.device === this.device, `${opName(op)}: ${label} belongs to a different GPUDevice`);
    }

    private gpuOutput(dtype: DType, shape: ReadonlyArray<number>, options: NdarrayOperationOptions, op: string): { out: GPUndarray; owned: boolean } {
        if (options.out === undefined) return { out: this.gpu.output(dtype, shape, options, op), owned: true };
        const out = options.out;
        assert(out instanceof GPUndarray, `${opName(op)}: out must be a GPUndarray`);
        this.assertGPUArray(out, op, "out");
        assert(options.copySrc === undefined && options.copyDst === undefined && options.usage === undefined, `${opName(op)}: copySrc, copyDst, and usage apply only to newly created outputs`);
        assert(out.dtype === dtype, `${opName(op)}: out must have dtype ${dtype} (got ${out.dtype})`);
        assert(sameShape(out.shape, shape), `${opName(op)}: out must have shape [${shape}] (got [${out.shape}])`);
        assert(out.isContiguousC, `${opName(op)}: out must be C-contiguous`);
        return { out, owned: false };
    }

    private gpuRun(src: GPUndarray, dtype: DType, shape: ReadonlyArray<number>, options: NdarrayOperationOptions, op: string, encode: (commands: ComputeDispatchCommand[], out: GPUndarray, src: GPUndarray) => void): GPUndarray {
        this.assertGPUArray(src, op);
        const { out, owned } = this.gpuOutput(dtype, shape, options, op);
        const commands: ComputeDispatchCommand[] = [];
        try {
            const input = (out.buffer.buffer === src.buffer.buffer && out.numel > 0) ? this.gpu.stage(src, commands, options.encoder, op) : src;
            encode(commands, out, input);
            this.gpu.submit(commands, options.encoder, options.label, op);
            return out;
        } catch (error) { if (owned) out.destroy(); throw error; } finally { this.scratch.reset(options.encoder); }
    }

    private castImpl<T extends AnyNdarray>(a: T, dtype: DType, options: NdarrayCastOptions, op: string): T {
        this.assertAlive(op);
        assertNdarray(a, op);
        dtypeInfo(dtype);
        const mode = resolveIntMode(a.dtype, options, op);
        if (a instanceof CPUndarray) {
            assertCPUOptions(options, op);
            a[ndarrayAssertAlive]();
            const out = CPUndarray.empty(dtype, { shape: a.shape });
            try { cpuCopy(out, a, a.stridesBytes, mode, op); return out as T; }
            catch (error) { out.destroy(); throw error; }
        }
        assertGPUCast(a.dtype, dtype, op);
        return this.gpuRun(a as GPUndarray, dtype, a.shape, options, op, (commands, out, src) => {
            this.gpu.gather(commands, options.encoder, { dst: out, src, entryPoint: "gather", constants: castConstants(src.dtype, dtype, mode), srcStrides: src.stridesBytes }, op);
        }) as T;
    }

    contiguous<T extends AnyNdarray>(a: T, options: NdarrayOperationOptions = {}): T {
        return this.castImpl(a, a.dtype, options, "contiguous");
    }

    cast<T extends AnyNdarray>(a: T, dtype: DType, options: NdarrayCastOptions = {}): T {
        return this.castImpl(a, dtype, options, "cast");
    }

    copyInto(dst: AnyNdarray, src: AnyNdarray, options: NdarrayCopyIntoOptions = {}): void {
        const op = "copyInto";
        this.assertAlive(op);
        assertNdarray(dst, op, "destination");
        assertNdarray(src, op, "source");
        dst[ndarrayAssertAlive]();
        src[ndarrayAssertAlive]();
        assert(dst.residency === src.residency, `${opName(op)}: destination and source must have the same residency (got ${dst.residency} and ${src.residency}); use compute.ndarray.toGPU() or compute.ndarray.toCPU() first`);
        const srcStrides = broadcastStrides(src.shape, src.stridesBytes, dst.shape, opName(op));
        assert(!mayAddressTwice(dst.shape, dst.stridesBytes, dst.bytesPerElement), `${opName(op)}: the destination may address the same memory more than once (broadcast or overlapping strides)`);
        const mode = resolveIntMode(src.dtype, options, op);
        if (dst instanceof CPUndarray) {
            assert(options.encoder === undefined && options.label === undefined, `${opName(op)}: GPU options (encoder, label) are not supported for CPU arrays`);
            const source = src as CPUndarray;
            if (dst.numel === 0) return;
            if (!cpuMayOverlap(dst, source)) { cpuCopy(dst, source, srcStrides, mode, op); return; }
            const temp = CPUndarray.empty(source.dtype, { shape: source.shape });
            try {
                cpuCopy(temp, source, source.stridesBytes, mode, op);
                cpuCopy(dst, temp, broadcastStrides(temp.shape, temp.stridesBytes, dst.shape, opName(op)), mode, op);
            } finally { temp.destroy(); }
            return;
        }
        const target = dst as GPUndarray;
        const source = src as GPUndarray;
        this.assertGPUArray(target, op, "destination");
        this.assertGPUArray(source, op, "source");
        assertGPUCast(source.dtype, target.dtype, op);
        assert(target.bytesPerElement >= 4 || target.isContiguousC, `${opName(op)}: GPU destinations with 8-bit or 16-bit dtypes must be C-contiguous`);
        if (target.numel === 0) return;
        const commands: ComputeDispatchCommand[] = [];
        try {
            const input = (target.buffer.buffer === source.buffer.buffer) ? this.gpu.stage(source, commands, options.encoder, op) : source;
            const strides = (input === source) ? srcStrides : broadcastStrides(input.shape, input.stridesBytes, target.shape, opName(op));
            this.gpu.gather(commands, options.encoder, { dst: target, src: input, entryPoint: "gather", constants: castConstants(input.dtype, target.dtype, mode), srcStrides: strides }, op);
            this.gpu.submit(commands, options.encoder, options.label, op);
        } finally { this.scratch.reset(options.encoder); }
    }

    pad<T extends AnyNdarray>(a: T, options: NdarrayPadOptions): T {
        const op = "pad";
        this.assertAlive(op);
        assertNdarray(a, op);
        assert(typeof options === "object" && options !== null, `${opName(op)}: options with a width are required`);
        const mode = options.mode ?? "constant";
        assert(PAD_MODE_CODE[mode] !== undefined, `${opName(op)}: mode must be "constant", "edge", "reflect", "symmetric", or "wrap" (got ${String(mode)})`);
        assert(mode === "constant" || options.value === undefined, `${opName(op)}: value applies only to mode "constant"`);
        const value = options.value ?? 0;
        validateElementValue(a.dtype, value, op);
        const { before, after } = normalizePadWidth(options.width, a.ndim, op);
        const shape = a.shape.map((n, i) => n + before[i]! + after[i]!);
        for (let i = 0; i < a.ndim; i++) {
            assert(shape[i]! <= 0xFFFFFFFF, `${opName(op)}: padded shape[${i}] must fit in u32 (got ${shape[i]})`);
            assert(a.shape[i]! > 0 || shape[i] === 0 || mode === "constant", `${opName(op)}: cannot pad an empty axis (${i}) with mode "${mode}"`);
        }
        assert(numelFromShape(shape) <= 0xFFFFFFFF, `${opName(op)}: the number of padded elements must fit in u32`);
        const keep = a.shape.map((_, i) => before[i]! + after[i]! > 0);
        const bits = elementBits(a.dtype, value);
        if (a instanceof CPUndarray) {
            assertCPUOptions(options, op);
            a[ndarrayAssertAlive]();
            const out = CPUndarray.empty(a.dtype, { shape });
            try { cpuPad(out, a, before, keep, mode, bits, op); return out as T; }
            catch (error) { out.destroy(); throw error; }
        }
        for (let i = 0; i < a.ndim; i++) assert(shape[i]! <= 0x7FFFFFFF, `${opName(op)}: GPU padding supports padded axes up to 2^31 - 1 elements (axis ${i} has ${shape[i]})`);
        return this.gpuRun(a as GPUndarray, a.dtype, shape, options, op, (commands, out, src) => {
            this.gpu.gather(commands, options.encoder, { dst: out, src, entryPoint: "gather", constants: { SRC_DTYPE: DTYPE_CODE[a.dtype], DST_DTYPE: DTYPE_CODE[a.dtype], OPERATION: 1, PAD_MODE: PAD_MODE_CODE[mode] }, srcStrides: src.stridesBytes, keep, srcShape: src.shape, before, valueBits: bits }, op);
        }) as T;
    }

    normalize<T extends AnyNdarray>(a: T, options: NdarrayNormalizeOptions): T {
        const op = "normalize";
        this.assertAlive(op);
        assertNdarray(a, op);
        assert(typeof options === "object" && options !== null, `${opName(op)}: options are required`);
        const meanStd = options.mean !== undefined || options.std !== undefined;
        const scaleOffset = options.scale !== undefined || options.offset !== undefined;
        assert(!(meanStd && scaleOffset), `${opName(op)}: use either { scale, offset } or { mean, std }, not both`);
        assert(meanStd || scaleOffset, `${opName(op)}: provide scale and/or offset, or mean and std`);
        if (meanStd) assert(options.mean !== undefined && options.std !== undefined, `${opName(op)}: { mean, std } requires both mean and std`);
        let p0 = normalizeParameter(meanStd ? options.mean! : (options.scale ?? 1), meanStd ? "mean" : "scale", op);
        let p1 = normalizeParameter(meanStd ? options.std! : (options.offset ?? 0), meanStd ? "std" : "offset", op);
        const vector = p0.length > 1 || p1.length > 1;
        const axis = (options.axis === undefined) ? -1 : normalizeAxis(options.axis, a.ndim, opName(op));
        assert(!vector || axis >= 0, `${opName(op)}: axis is required when a parameter has more than one value`);
        const length = vector ? a.shape[axis]! : 1;
        for (const [label, values] of [[meanStd ? "mean" : "scale", p0], [meanStd ? "std" : "offset", p1]] as const) assert(values.length === 1 || values.length === length, `${opName(op)}: ${label} must have 1 or ${length} values (got ${values.length})`);
        if (vector) { p0 = (p0.length === 1) ? new Array(length).fill(p0[0]) : p0; p1 = (p1.length === 1) ? new Array(length).fill(p1[0]) : p1; }
        if (meanStd) assert(p1.every((v) => v !== 0), `${opName(op)}: std must be nonzero`);
        const dtype = options.dtype ?? (isFloatDType(a.dtype) ? a.dtype : "f32");
        dtypeInfo(dtype);
        if (a instanceof CPUndarray) {
            assertCPUOptions(options, op);
            a[ndarrayAssertAlive]();
            const out = CPUndarray.empty(dtype, { shape: a.shape });
            try { cpuAffine(out, a, axis, p0, p1, meanStd, op); return out as T; }
            catch (error) { out.destroy(); throw error; }
        }
        assert(a.dtype !== "f64" && dtype !== "f64", `${opName(op)}: GPU normalize computes in f32 and does not support f64 inputs or outputs; use a CPU array`);
        const f0 = p0.map(Math.fround), f1 = p1.map(Math.fround);
        assert([...f0, ...f1].every(Number.isFinite) && (!meanStd || f1.every((v) => v !== 0)), `${opName(op)}: parameters must stay finite (and std nonzero) when rounded to f32 for the GPU`);
        const table = new Uint32Array(new Float32Array([...f0, ...f1]).buffer);
        return this.gpuRun(a as GPUndarray, dtype, a.shape, options, op, (commands, out, src) => {
            this.gpu.gather(commands, options.encoder, { dst: out, src, entryPoint: "gather", constants: { SRC_DTYPE: DTYPE_CODE[src.dtype], DST_DTYPE: DTYPE_CODE[dtype], OPERATION: 2, AFFINE_FORM: meanStd ? 1 : 0, OVERFLOW: 1, ROUNDING: 1 }, srcStrides: src.stridesBytes, keep: a.shape.map((_, i) => i === axis && vector), paramAxis: vector ? axis : -1, paramLen: f0.length, table }, op);
        }) as T;
    }

    resize<T extends AnyNdarray>(a: T, options: NdarrayResizeOptions): T {
        const op = "resize";
        this.assertAlive(op);
        assertNdarray(a, op);
        assert(typeof options === "object" && options !== null, `${opName(op)}: options with axes and size are required`);
        assert(Array.isArray(options.axes) && options.axes.length === 2, `${opName(op)}: axes must be two axes`);
        const axes = normalizeAxes(options.axes, a.ndim, opName(op)) as unknown as readonly [number, number];
        assert(Array.isArray(options.size) && options.size.length === 2, `${opName(op)}: size must be two integers`);
        for (const n of options.size) assert(Number.isInteger(n) && n >= 0 && n <= 0xFFFFFFFF, `${opName(op)}: size entries must be integers >= 0 that fit in u32 (got ${n})`);
        const method = options.method ?? "linear";
        assert(method === "nearest" || method === "linear", `${opName(op)}: method must be "nearest" or "linear" (got ${String(method)})`);
        const alignCorners = options.alignCorners ?? false;
        assert(typeof alignCorners === "boolean", `${opName(op)}: alignCorners must be a boolean`);
        assert(!(alignCorners && method === "nearest"), `${opName(op)}: alignCorners applies only to method "linear"`);
        const boundary = options.boundary ?? "edge";
        assert(PAD_MODE_CODE[boundary] !== undefined, `${opName(op)}: boundary must be "edge", "constant", "reflect", "symmetric", or "wrap" (got ${String(boundary)})`);
        assert(boundary === "constant" || options.value === undefined, `${opName(op)}: value applies only to boundary "constant"`);
        const value = options.value ?? 0;
        assert(typeof value === "number", `${opName(op)}: value must be a number`);
        const shape = a.shape.slice();
        for (let k = 0; k < 2; k++) {
            const axis = axes[k]!;
            assert(a.shape[axis]! > 0 || options.size[k] === 0, `${opName(op)}: cannot resize empty axis ${axis} to ${options.size[k]}`);
            shape[axis] = options.size[k]!;
        }
        assert(numelFromShape(shape) <= 0xFFFFFFFF, `${opName(op)}: the number of output elements must fit in u32`);
        const dtype = options.dtype ?? a.dtype;
        dtypeInfo(dtype);
        const tables = [0, 1].map((k) => buildResizeTable(a.shape[axes[k]!]!, shape[axes[k]!]!, method, alignCorners, boundary)) as unknown as readonly [ResizeTable, ResizeTable];
        if (a instanceof CPUndarray) {
            assertCPUOptions(options, op);
            a[ndarrayAssertAlive]();
            const out = CPUndarray.empty(dtype, { shape });
            try { cpuResize(out, a, axes, tables, method === "linear", value, op); return out as T; }
            catch (error) { out.destroy(); throw error; }
        }
        assert(a.dtype !== "f64" && dtype !== "f64", `${opName(op)}: GPU resize computes in f32 and does not support f64 inputs or outputs; use a CPU array`);
        const [ty, tx] = tables;
        const table = new Uint32Array(4 * (ty.i0.length + tx.i0.length));
        const asWords = (w: Float64Array): Uint32Array => new Uint32Array(new Float32Array(w).buffer);
        table.set(new Uint32Array(ty.i0.buffer), 0);
        table.set(new Uint32Array(ty.i1.buffer), ty.i0.length);
        table.set(asWords(ty.w0), 2 * ty.i0.length);
        table.set(asWords(ty.w1), 3 * ty.i0.length);
        const tx0 = 4 * ty.i0.length;
        table.set(new Uint32Array(tx.i0.buffer), tx0);
        table.set(new Uint32Array(tx.i1.buffer), tx0 + tx.i0.length);
        table.set(asWords(tx.w0), tx0 + 2 * tx.i0.length);
        table.set(asWords(tx.w1), tx0 + 3 * tx.i0.length);
        return this.gpuRun(a as GPUndarray, dtype, shape, options, op, (commands, out, src) => {
            this.gpu.gather(commands, options.encoder, { dst: out, src, entryPoint: "resize", constants: { SRC_DTYPE: DTYPE_CODE[src.dtype], DST_DTYPE: DTYPE_CODE[dtype], OPERATION: 3, RESIZE_METHOD: method === "linear" ? 1 : 0, OVERFLOW: 1, ROUNDING: 1 }, srcStrides: src.stridesBytes, keep: shape.map((_, i) => i === axes[0] || i === axes[1]), resizeAxes: axes, valueBits: elementBits("f32", value), table }, op);
        }) as T;
    }

    private assertAlive(op: string): void {
        assert(!this.destroyed, `${opName(op)}: compute.ndarray has been destroyed`);
    }

    private resolveResidency(options: NdarrayCreateOptions, op: string): NdarrayResidency {
        const residency = options.residency ?? "cpu";
        assert(residency === "cpu" || residency === "gpu", `${opName(op)}: residency must be "cpu" or "gpu" (got ${String(residency)})`);
        if (residency === "cpu") assert(!hasGPUOptions(options), `${opName(op)}: GPU buffer options (label, copySrc, copyDst, usage) require residency: "gpu"`);
        return residency;
    }

    private gpuDescriptor(options: NdarrayGPUOptions): Omit<StorageBufferDescriptor, "byteLength" | "data"> {
        return { label: options.label, copySrc: options.copySrc ?? true, copyDst: options.copyDst ?? true, usage: options.usage };
    }

    empty(dtype: DType, layout: NdLayoutDescriptor, options: NdarrayCreateOptions & { residency: "gpu" }): GPUndarray;
    empty(dtype: DType, layout: NdLayoutDescriptor, options?: NdarrayCreateOptions & { residency?: "cpu" }): CPUndarray;
    empty(dtype: DType, layout: NdLayoutDescriptor, options?: NdarrayCreateOptions): CPUndarray | GPUndarray;
    empty(dtype: DType, layout: NdLayoutDescriptor, options: NdarrayCreateOptions = {}): CPUndarray | GPUndarray {
        this.assertAlive("empty");
        if (this.resolveResidency(options, "empty") === "cpu") return CPUndarray.empty(dtype, layout);
        return GPUndarray.empty({ device: this.device, queue: this.queue }, dtype, layout, this.gpuDescriptor(options));
    }

    zeros(dtype: DType, layout: NdLayoutDescriptor, options: NdarrayCreateOptions & { residency: "gpu" }): GPUndarray;
    zeros(dtype: DType, layout: NdLayoutDescriptor, options?: NdarrayCreateOptions & { residency?: "cpu" }): CPUndarray;
    zeros(dtype: DType, layout: NdLayoutDescriptor, options?: NdarrayCreateOptions): CPUndarray | GPUndarray;
    zeros(dtype: DType, layout: NdLayoutDescriptor, options: NdarrayCreateOptions = {}): CPUndarray | GPUndarray {
        this.assertAlive("zeros");
        if (this.resolveResidency(options, "zeros") === "cpu") return CPUndarray.zeros(dtype, layout);
        return GPUndarray.empty({ device: this.device, queue: this.queue }, dtype, layout, this.gpuDescriptor(options));
    }

    fromArray(dtype: DType, shape: ReadonlyArray<number>, src: ArrayLike<number>, options: NdarrayCreateOptions & { residency: "gpu" }): GPUndarray;
    fromArray(dtype: DType, shape: ReadonlyArray<number>, src: ArrayLike<number>, options?: NdarrayCreateOptions & { residency?: "cpu" }): CPUndarray;
    fromArray(dtype: DType, shape: ReadonlyArray<number>, src: ArrayLike<number>, options?: NdarrayCreateOptions): CPUndarray | GPUndarray;
    fromArray(dtype: DType, shape: ReadonlyArray<number>, src: ArrayLike<number>, options: NdarrayCreateOptions = {}): CPUndarray | GPUndarray {
        this.assertAlive("fromArray");
        if (this.resolveResidency(options, "fromArray") === "cpu") return CPUndarray.fromArray(dtype, shape, src);
        const info = dtypeInfo(dtype);
        const dims = validateShape(shape);
        const stridesBytes = defaultRowMajorStridesBytes(dims, info.bytesPerElement);
        const byteLength = requiredBackingBytes(dims, stridesBytes, 0, info.bytesPerElement);
        const numel = numelFromShape(dims);
        assert(src.length >= numel, `source length (${src.length}) must be >= numel (${numel})`);
        const data = new info.ctor(new ArrayBuffer(byteLength));
        for (let i = 0; i < numel; i++) data[i] = src[i] as number;
        const sb = new StorageBuffer(this.device, this.queue, { ...this.gpuDescriptor(options), data: data as unknown as BufferSource });
        return new GPUndarray(dtype, dims, stridesBytes, 0, byteLength, sb, 0, true);
    }

    wrap(buffer: StorageBuffer, dtype: DType, layout: NdLayoutDescriptor, baseOffsetBytes: number = 0): GPUndarray {
        this.assertAlive("wrap");
        assert(buffer instanceof StorageBuffer, `${opName("wrap")}: buffer must be a StorageBuffer`);
        assert(buffer.device === this.device, `${opName("wrap")}: buffer belongs to a different GPUDevice`);
        return GPUndarray.wrap(buffer, dtype, layout, baseOffsetBytes);
    }

    toGPU(src: CPUndarray, options: NdarrayGPUOptions = {}): GPUndarray {
        this.assertAlive("toGPU");
        assert(src instanceof CPUndarray, `${opName("toGPU")}: source must be a CPUndarray`);
        const bytes = src.backingBytes();
        const sb = new StorageBuffer(this.device, this.queue, { ...this.gpuDescriptor(options), byteLength: src.byteLength, data: bytes });
        return new GPUndarray(src.dtype, src.shape.slice(), src.stridesBytes.slice(), src.offsetBytes, src.byteLength, sb, 0, true);
    }

    async toCPU(src: GPUndarray): Promise<CPUndarray> {
        this.assertAlive("toCPU");
        assert(src instanceof GPUndarray, `${opName("toCPU")}: source must be a GPUndarray`);
        src[ndarrayAssertAlive]();
        assert(src.buffer.canReadback, "compute.ndarray.toCPU() requires the underlying StorageBuffer to be created with copySrc: true");
        const cpu = CPUndarray.empty(src.dtype, { shape: src.shape, stridesBytes: src.stridesBytes, offsetBytes: src.offsetBytes });
        try {
            if (this.readback && !this.readback.isDestroyed) {
                await this.readback.readIntoWasmMemory(wasm.memory(), cpu.basePtrBytes, src.buffer, src.baseOffsetBytes, src.byteLength, { label: "compute.ndarray.toCPU" });
            } else {
                const bytes = await src.buffer.read(src.baseOffsetBytes, src.byteLength);
                cpu.backingBytes().set(new Uint8Array(bytes), 0);
            }
            return cpu;
        } catch (error) { cpu.destroy(); throw error; }
    }

    slice<T extends AnyNdarray>(a: T, spec: ReadonlyArray<NdarraySliceEntry>): T {
        const op = "slice";
        this.assertAlive(op);
        assertNdarray(a, op);
        assert(Array.isArray(spec), `${opName(op)}: spec must be an array`);
        assert(spec.length <= a.ndim, `${opName(op)}: spec has ${spec.length} entries for an array with ${a.ndim} dimensions`);
        const shape: number[] = [];
        const strides: number[] = [];
        let offset = a.offsetBytes;
        for (let axis = 0; axis < a.ndim; axis++) {
            const n = a.shape[axis]!;
            const stride = a.stridesBytes[axis]!;
            const entry = (axis < spec.length) ? spec[axis] : null;
            if (entry === null) { shape.push(n); strides.push(stride); continue; }
            if (typeof entry === "number") {
                assert(Number.isInteger(entry), `${opName(op)}: index for axis ${axis} must be an integer (got ${entry})`);
                const index = (entry < 0) ? entry + n : entry;
                assert(index >= 0 && index < n, `${opName(op)}: index ${entry} is out of bounds for axis ${axis} with size ${n}`);
                offset += index * stride;
                continue;
            }
            assert(Array.isArray(entry), `${opName(op)}: spec[${axis}] must be null, an integer, or a [start, stop, step] array`);
            const { start, length, step } = sliceIndices(n, entry as unknown as NdarraySliceRange, axis, opName(op));
            if (length > 0) offset += start * stride;
            const stepped = stride * step;
            shape.push(length);
            strides.push((length <= 1 && (stepped < -0x80000000 || stepped > 0x7FFFFFFF)) ? stride : stepped);
        }
        return a[ndarrayView](shape, validateStridesBytes(strides, shape.length, a.bytesPerElement, `${opName(op)}: `), offset) as T;
    }

    transpose<T extends AnyNdarray>(a: T, axes?: ReadonlyArray<number>): T {
        const op = "transpose";
        this.assertAlive(op);
        assertNdarray(a, op);
        const order = (axes === undefined) ? a.shape.map((_, i) => a.ndim - 1 - i) : normalizeAxes(axes, a.ndim, opName(op));
        assert(order.length === a.ndim, `${opName(op)}: axes must list all ${a.ndim} dimensions (got ${order.length})`);
        return a[ndarrayView](order.map((i) => a.shape[i]!), order.map((i) => a.stridesBytes[i]!), a.offsetBytes) as T;
    }

    swapAxes<T extends AnyNdarray>(a: T, axis1: number, axis2: number): T {
        const op = "swapAxes";
        this.assertAlive(op);
        assertNdarray(a, op);
        const i = normalizeAxis(axis1, a.ndim, opName(op));
        const j = normalizeAxis(axis2, a.ndim, opName(op));
        const order = a.shape.map((_, k) => (k === i) ? j : (k === j) ? i : k);
        return a[ndarrayView](order.map((k) => a.shape[k]!), order.map((k) => a.stridesBytes[k]!), a.offsetBytes) as T;
    }

    moveAxis<T extends AnyNdarray>(a: T, source: number, destination: number): T {
        const op = "moveAxis";
        this.assertAlive(op);
        assertNdarray(a, op);
        const from = normalizeAxis(source, a.ndim, opName(op));
        const to = normalizeAxis(destination, a.ndim, opName(op));
        const order = a.shape.map((_, k) => k).filter((k) => k !== from);
        order.splice(to, 0, from);
        return a[ndarrayView](order.map((k) => a.shape[k]!), order.map((k) => a.stridesBytes[k]!), a.offsetBytes) as T;
    }

    flip<T extends AnyNdarray>(a: T, axes?: number | ReadonlyArray<number>): T {
        const op = "flip";
        this.assertAlive(op);
        assertNdarray(a, op);
        const list = (axes === undefined) ? a.shape.map((_, i) => i) : normalizeAxes(axes, a.ndim, opName(op));
        const strides = a.stridesBytes.slice();
        let offset = a.offsetBytes;
        for (const axis of list) {
            if (a.shape[axis]! > 0) offset += (a.shape[axis]! - 1) * strides[axis]!;
            strides[axis] = -strides[axis]!;
        }
        return a[ndarrayView](a.shape.slice(), validateStridesBytes(strides, a.ndim, a.bytesPerElement, `${opName(op)}: `), offset) as T;
    }

    reshape<T extends AnyNdarray>(a: T, shape: ReadonlyArray<number>): T {
        const op = "reshape";
        this.assertAlive(op);
        assertNdarray(a, op);
        assert(Array.isArray(shape), `${opName(op)}: shape must be an array of dimension sizes`);
        let inferred = -1;
        let known = 1;
        for (let i = 0; i < shape.length; i++) {
            if (shape[i] === -1) {
                assert(inferred < 0, `${opName(op)}: at most one dimension may be -1`);
                inferred = i;
            } else {
                assert(Number.isInteger(shape[i]) && shape[i]! >= 0, `${opName(op)}: shape[${i}] must be an integer >= 0 or -1 (got ${shape[i]})`);
                known *= shape[i]!;
            }
        }
        const dims = shape.slice();
        if (inferred >= 0) {
            assert(known > 0 && a.numel % known === 0, `${opName(op)}: cannot infer dimension ${inferred} when reshaping [${a.shape}] into [${shape}]`);
            dims[inferred] = a.numel / known;
        }
        const target = validateShape(dims, `${opName(op)}: `);
        assert(numelFromShape(target) === a.numel, `${opName(op)}: cannot reshape [${a.shape}] (${a.numel} elements) into [${target}]`);
        let strides: number[] | null;
        if (a.numel === 0) strides = defaultRowMajorStridesBytes(target.map((d) => Math.max(d, 1)), a.bytesPerElement);
        else strides = nocopyReshapeStrides(a.shape, a.stridesBytes, target, a.bytesPerElement);
        assert(strides !== null, `${opName(op)}: reshaping [${a.shape}] with strides [${a.stridesBytes}] into [${target}] requires a copy; call compute.ndarray.contiguous() first`);
        return a[ndarrayView](target, validateStridesBytes(strides, target.length, a.bytesPerElement, `${opName(op)}: `), a.offsetBytes) as T;
    }

    squeeze<T extends AnyNdarray>(a: T, axes?: number | ReadonlyArray<number>): T {
        const op = "squeeze";
        this.assertAlive(op);
        assertNdarray(a, op);
        const drop = new Set(axes === undefined ? a.shape.flatMap((d, i) => (d === 1) ? [i] : []) : normalizeAxes(axes, a.ndim, opName(op)));
        for (const axis of drop) assert(a.shape[axis] === 1, `${opName(op)}: cannot squeeze axis ${axis} with size ${a.shape[axis]}`);
        const keep = a.shape.map((_, i) => i).filter((i) => !drop.has(i));
        return a[ndarrayView](keep.map((i) => a.shape[i]!), keep.map((i) => a.stridesBytes[i]!), a.offsetBytes) as T;
    }

    expandDims<T extends AnyNdarray>(a: T, axis: number | ReadonlyArray<number>): T {
        const op = "expandDims";
        this.assertAlive(op);
        assertNdarray(a, op);
        const count = (typeof axis === "number") ? 1 : (Array.isArray(axis) ? axis.length : 0);
        const inserted = new Set(normalizeAxes(axis, a.ndim + count, opName(op)));
        const ndim = a.ndim + inserted.size;
        const shape = new Array<number>(ndim);
        const strides = new Array<number>(ndim);
        for (let i = 0, j = 0; i < ndim; i++) {
            if (inserted.has(i)) continue;
            shape[i] = a.shape[j]!;
            strides[i] = a.stridesBytes[j]!;
            j++;
        }
        for (let i = ndim - 1; i >= 0; i--) {
            if (!inserted.has(i)) continue;
            shape[i] = 1;
            const stride = (i === ndim - 1) ? a.bytesPerElement : strides[i + 1]! * shape[i + 1]!;
            strides[i] = (stride >= -0x80000000 && stride <= 0x7FFFFFFF && stride !== 0) ? stride : a.bytesPerElement;
        }
        return a[ndarrayView](shape, strides, a.offsetBytes) as T;
    }

    broadcastTo<T extends AnyNdarray>(a: T, shape: ReadonlyArray<number>): T {
        const op = "broadcastTo";
        this.assertAlive(op);
        assertNdarray(a, op);
        const target = validateShape(shape, `${opName(op)}: `);
        assert(numelFromShape(target) <= 0xFFFFFFFF, `${opName(op)}: the number of elements of [${target}] must fit in u32`);
        return a[ndarrayView](target, broadcastStrides(a.shape, a.stridesBytes, target, opName(op)), a.offsetBytes) as T;
    }
}
