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
import ndarrayReduceWGSL from "../../wgsl/compute/ndarray-reduce.wgsl";
import ndarrayAffineWGSL from "../../wgsl/compute/ndarray-affine.wgsl";

const NDARRAY_REDUCE_WGSL = ndarrayWGSL + ndarrayReduceWGSL;
const NDARRAY_AFFINE_WGSL = ndarrayWGSL + ndarrayAffineWGSL;

export type RealDType = "i8" | "u8" | "i16" | "u16" | "i32" | "u32" | "f32" | "f64";

export type ComplexDType = "c64" | "c128";

export type DType = RealDType | ComplexDType;

export type DTypeKind = "int" | "uint" | "float" | "complex";

export type ComplexScalar = readonly [re: number, im: number];

export type NdarrayResidency = "cpu" | "gpu";

export type NumberTypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;

export interface NumberTypedArrayConstructor<T extends NumberTypedArray> {
    readonly BYTES_PER_ELEMENT: number;
    new(buffer: ArrayBufferLike, byteOffset?: number, length?: number): T;
}

export type DTypeInfo<T extends NumberTypedArray = NumberTypedArray> = {
    readonly dtype: DType;
    readonly kind: DTypeKind;
    readonly ctor: NumberTypedArrayConstructor<T>;
    readonly components: 1 | 2;
    readonly componentDType: RealDType;
    readonly bytesPerElement: number;
    readonly wgslElementType: "i32" | "u32" | "f32" | "vec2<f32>" | null;
};

const DTYPE_TABLE: Record<DType, DTypeInfo> = {
    i8: { dtype: "i8", kind: "int", ctor: Int8Array, components: 1, componentDType: "i8", bytesPerElement: 1, wgslElementType: null },
    u8: { dtype: "u8", kind: "uint", ctor: Uint8Array, components: 1, componentDType: "u8", bytesPerElement: 1, wgslElementType: null },
    i16: { dtype: "i16", kind: "int", ctor: Int16Array, components: 1, componentDType: "i16", bytesPerElement: 2, wgslElementType: null },
    u16: { dtype: "u16", kind: "uint", ctor: Uint16Array, components: 1, componentDType: "u16", bytesPerElement: 2, wgslElementType: null },
    i32: { dtype: "i32", kind: "int", ctor: Int32Array, components: 1, componentDType: "i32", bytesPerElement: 4, wgslElementType: "i32" },
    u32: { dtype: "u32", kind: "uint", ctor: Uint32Array, components: 1, componentDType: "u32", bytesPerElement: 4, wgslElementType: "u32" },
    f32: { dtype: "f32", kind: "float", ctor: Float32Array, components: 1, componentDType: "f32", bytesPerElement: 4, wgslElementType: "f32" },
    f64: { dtype: "f64", kind: "float", ctor: Float64Array, components: 1, componentDType: "f64", bytesPerElement: 8, wgslElementType: null },
    c64: { dtype: "c64", kind: "complex", ctor: Float32Array, components: 2, componentDType: "f32", bytesPerElement: 8, wgslElementType: "vec2<f32>" },
    c128: { dtype: "c128", kind: "complex", ctor: Float64Array, components: 2, componentDType: "f64", bytesPerElement: 16, wgslElementType: null }
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

const DTYPE_CODE: Record<DType, number> = { i8: 0, u8: 1, i16: 2, u16: 3, i32: 4, u32: 5, f32: 6, f64: 7, c64: 8, c128: 9 };

const INTEGER_RANGE: Record<DType, readonly [number, number] | null> = { i8: [-128, 127], u8: [0, 255], i16: [-32768, 32767], u16: [0, 65535], i32: [-2147483648, 2147483647], u32: [0, 4294967295], f32: null, f64: null, c64: null, c128: null };

const isFloatDType = (dtype: DType): boolean => dtype === "f32" || dtype === "f64";

const isComplexDType = (dtype: DType): dtype is ComplexDType => dtype === "c64" || dtype === "c128";

const assertSourceLength = (dtype: DType, numel: number, length: number): number => {
    const components = dtypeInfo(dtype).components;
    if (components === 1) assert(length >= numel, `source length (${length}) must be >= numel (${numel})`);
    else assert(length >= numel * components, `source length (${length}) must be >= ${numel * components} (${components} interleaved [re, im] components for each of the ${numel} ${dtype} elements)`);
    return numel * components;
};

export const sameShape = (a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean => a.length === b.length && a.every((dim, i) => dim === b[i]);

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

export const broadcastStrides = (shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>, target: ReadonlyArray<number>, op: string): number[] => {
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

export const coalesceDims = (shape: ReadonlyArray<number>, strides: ReadonlyArray<ReadonlyArray<number>>, keep: ReadonlyArray<boolean> = []): CoalescedLayout => {
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

export const mayAddressTwice = (shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>, bytesPerElement: number): boolean => {
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

const placeView = (parent: Ndarray, shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>, offsetBytes: number, bytesPerElement: number, granularity: number): { offsetBytes: number; byteLength: number; shiftBytes: number } => {
    const extent = byteExtent(shape, stridesBytes, offsetBytes);
    if (!extent) return { offsetBytes: 0, byteLength: 0, shiftBytes: 0 };
    assert(extent.min >= 0 && extent.max + bytesPerElement <= parent.byteLength, "internal error: ndarray view escapes its base storage");
    const shiftBytes = extent.min - (extent.min % granularity);
    return { offsetBytes: offsetBytes - shiftBytes, byteLength: extent.max + bytesPerElement - shiftBytes, shiftBytes };
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

    get wgslElementType(): DTypeInfo["wgslElementType"] {
        return dtypeInfo(this.dtype).wgslElementType;
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

    abstract [ndarrayView](shape: number[], stridesBytes: number[], offsetBytes: number, dtype?: DType): Ndarray;
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
    private readonly _components: number;
    private readonly _componentBytes: number;

    private constructor(dtype: DType, shape: number[], stridesBytes: number[], offsetBytes: number, byteLength: number, basePtrBytes: WasmPtr, shapePtr: WasmPtr, stridesPtr: WasmPtr, pointers: boolean) {
        super(dtype, shape, stridesBytes, offsetBytes, byteLength);
        const info = dtypeInfo(dtype);
        this._components = info.components;
        this._componentBytes = info.ctor.BYTES_PER_ELEMENT;
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
            const count = assertSourceLength(dtype, dst.numel, src.length);
            const data = dst.data();
            for (let i = 0; i < count; i++) data[i] = src[i] as number;
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
        const ctor = dtypeInfo(this.dtype).ctor;
        if (this.numel === 0) return new ctor(wasm.memory().buffer as unknown as ArrayBuffer, 0, 0) as NumberTypedArray;
        return new ctor(wasm.memory().buffer as unknown as ArrayBuffer, (this._basePtrBytes + this.offsetBytes) >>> 0, (this.numel * this._components) >>> 0) as NumberTypedArray;
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

    get(...indices: number[]): number | ComplexScalar {
        const off = this.offsetBytesAt(indices);
        const abs = (this._basePtrBytes + off) >>> 0;
        assert((abs % this._componentBytes) === 0, "internal error: misaligned element address");
        const i = abs / this._componentBytes;
        const all = this.ensureAllView() as any;
        if (this._components === 1) return all[i] as number;
        return [all[i] as number, all[i + 1] as number];
    }

    set(value: number | ComplexScalar, ...indices: number[]): void {
        const off = this.offsetBytesAt(indices);
        const abs = (this._basePtrBytes + off) >>> 0;
        assert((abs % this._componentBytes) === 0, "internal error: misaligned element address");
        const i = abs / this._componentBytes;
        const all = this.ensureAllView() as any;
        if (this._components === 1) {
            assert(!Array.isArray(value), () => `CPUndarray.set(): a [re, im] value requires a complex dtype (got ${this.dtype})`);
            all[i] = value;
            return;
        }
        if (typeof value === "number") { all[i] = value; all[i + 1] = 0; return; }
        assert(Array.isArray(value) && value.length === 2, () => `CPUndarray.set(): ${this.dtype} values must be numbers or [re, im] tuples`);
        all[i] = value[0];
        all[i + 1] = value[1];
    }

    zero_(): void {
        this.assertAlive();
        if (this.byteLength === 0) return;
        const bytes = this.backingBytes();
        if (this[ndarrayBase] === null) { bytes.fill(0); return; }
        if (this.isContiguousC) { bytes.fill(0, this.offsetBytes, this.offsetBytes + this.numel * this.bytesPerElement); return; }
        forEachElementOffset(this.shape, this.stridesBytes, this.offsetBytes, (off) => bytes.fill(0, off, off + this.bytesPerElement));
    }

    [ndarrayView](shape: number[], stridesBytes: number[], offsetBytes: number, dtype: DType = this.dtype): CPUndarray {
        this.assertAlive();
        const place = placeView(this, shape, stridesBytes, offsetBytes, dtypeInfo(dtype).bytesPerElement, 1);
        const view = new CPUndarray(dtype, shape, stridesBytes, place.offsetBytes, place.byteLength, (this._basePtrBytes + place.shiftBytes) >>> 0, 0, 0, false);
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

    [ndarrayView](shape: number[], stridesBytes: number[], offsetBytes: number, dtype: DType = this.dtype): GPUndarray {
        this[ndarrayAssertAlive]();
        const place = placeView(this, shape, stridesBytes, offsetBytes, dtypeInfo(dtype).bytesPerElement, 4);
        const view = new GPUndarray(dtype, shape, stridesBytes, place.offsetBytes, place.byteLength, this.buffer, this.baseOffsetBytes + place.shiftBytes, false);
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

const qualifiedName = (op: string): string => op.startsWith("compute.") ? op : opName(op);

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
    value?: number | ComplexScalar;
};

export type NdarrayParameter = number | ArrayLike<number> | CPUndarray | GPUndarray;

export type NdarrayNormalizeMethod = "minmax" | "zscore";

type NdarrayNormalizeExplicit =
    | { scale?: NdarrayParameter; offset?: NdarrayParameter; mean?: undefined; std?: undefined; method?: undefined; axis?: number }
    | { mean: NdarrayParameter; std: NdarrayParameter; scale?: undefined; offset?: undefined; method?: undefined; axis?: number };

type NdarrayNormalizeStatistics = {
    scale?: undefined;
    offset?: undefined;
    mean?: undefined;
    std?: undefined;
    axes?: number | readonly number[];
    axis?: number;
    nan?: NdarrayNaNMode;
    epsilon?: number;
} & ({ method: "zscore"; ddof?: number; range?: undefined } | { method: "minmax"; range?: readonly [number, number]; ddof?: undefined });

export type NdarrayNormalizeOptions = NdarrayOperationOptions & (NdarrayNormalizeExplicit | NdarrayNormalizeStatistics) & { dtype?: DType };

export type NdarrayResizeMethod = "nearest" | "linear" | "cubic";

export type NdarrayResizeBoundary = NdarrayPadMode | "renormalize";

export type NdarrayResizeOptions = NdarrayOperationOptions & {
    axes: number | readonly number[];
    size: number | readonly number[];
    method?: NdarrayResizeMethod;
    alignCorners?: boolean;
    antialias?: boolean;
    cubicCoefficient?: number;
    boundary?: NdarrayResizeBoundary | readonly NdarrayResizeBoundary[];
    value?: number | ComplexScalar;
    dtype?: DType;
};

export type NdarrayResampleOptions = NdarrayOperationOptions & {
    axes: number | readonly number[];
    size: number | readonly number[];
    scale: number | readonly number[];
    offset?: number | readonly number[];
    method?: NdarrayResizeMethod;
    antialias?: boolean;
    cubicCoefficient?: number;
    boundary?: NdarrayResizeBoundary | readonly NdarrayResizeBoundary[];
    value?: number | ComplexScalar;
    dtype?: DType;
};

export type NdarrayNaNMode = "propagate" | "omit";

type NormalizeOptionBag = NdarrayOperationOptions & { scale?: unknown; offset?: unknown; mean?: unknown; std?: unknown; method?: unknown; axis?: number; axes?: number | readonly number[]; nan?: unknown; epsilon?: unknown; ddof?: unknown; range?: unknown; dtype?: DType };

export type NdarrayReduceOptions = NdarrayOperationOptions & {
    axes?: number | readonly number[];
    keepDims?: boolean;
    dtype?: DType;
    nan?: NdarrayNaNMode;
    overflow?: NdarrayOverflowMode;
};

export type NdarrayVarianceOptions = NdarrayReduceOptions & { ddof?: number; };

export type NdarrayArgReduceOptions = NdarrayOperationOptions & { axis?: number; keepDims?: boolean; nan?: NdarrayNaNMode; };

export type NdarrayMinMaxOptions = Omit<NdarrayReduceOptions, "out" | "dtype" | "overflow"> & { out?: { min?: GPUndarray; max?: GPUndarray }; };

export type NdarrayVarMeanOptions = Omit<NdarrayVarianceOptions, "out" | "overflow"> & { out?: { var?: GPUndarray; mean?: GPUndarray }; };

export type NdarrayStdMeanOptions = Omit<NdarrayVarianceOptions, "out" | "overflow"> & { out?: { std?: GPUndarray; mean?: GPUndarray }; };

export type NdarrayMinMaxResult<T> = { min: T; max: T };

export type NdarrayVarMeanResult<T> = { var: T; mean: T };

export type NdarrayStdMeanResult<T> = { std: T; mean: T };

export type NdarrayDescriptor = {
    maxCPUIntermediateBytes?: number;
};

type IntMode = { saturate: boolean; nearest: boolean };

const ARITHMETIC_MODE: IntMode = { saturate: true, nearest: true };

const resolveIntMode = (src: DType, options: { overflow?: NdarrayOverflowMode; rounding?: NdarrayRoundingMode }, op: string): IntMode => {
    assert(options.overflow === undefined || options.overflow === "wrap" || options.overflow === "saturate", `${opName(op)}: overflow must be "wrap" or "saturate" (got ${String(options.overflow)})`);
    assert(options.rounding === undefined || options.rounding === "trunc" || options.rounding === "nearest-even", `${opName(op)}: rounding must be "trunc" or "nearest-even" (got ${String(options.rounding)})`);
    return { saturate: (options.overflow ?? (isFloatDType(src) ? "saturate" : "wrap")) === "saturate", nearest: options.rounding === "nearest-even" };
};

const elementBits = (dtype: DType, value: number | ComplexScalar): Uint32Array => {
    const buffer = new ArrayBuffer(16);
    const components = new (dtypeInfo(dtype).ctor)(buffer);
    if (typeof value === "number") components[0] = value;
    else { components[0] = value[0]; components[1] = value[1]; }
    return new Uint32Array(buffer);
};

const validateElementValue = (dtype: DType, value: unknown, op: string): void => {
    if (isComplexDType(dtype)) {
        assert(typeof value === "number" || (Array.isArray(value) && value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number"), `${opName(op)}: a ${dtype} value must be a number or a [re, im] tuple of numbers (got ${String(value)})`);
        return;
    }
    assert(!Array.isArray(value), `${opName(op)}: a [re, im] value requires a complex dtype (got ${dtype})`);
    assert(typeof value === "number", `${opName(op)}: value must be a number (got ${String(value)})`);
    const range = INTEGER_RANGE[dtype];
    if (range) assert(Number.isInteger(value) && value >= range[0] && value <= range[1], `${opName(op)}: value ${value} is not exactly representable as ${dtype}`);
};

const rootOf = (a: Ndarray): Ndarray => a[ndarrayBase] ?? a;

const CPU_MAX_RANK = 64;

export const GPU_MAX_RANK = 8;

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
        if (ArrayBuffer.isView(values)) view.set(values);
        else for (let i = 0; i < values.length; i++) view[i] = values[i]! >>> 0;
        return ptr;
    }

    f64(values: ArrayLike<number>): WasmPtr {
        const n = Math.max(values.length, 1);
        const ptr = wasm.allocF64(n);
        assert(ptr !== 0, `compute.ndarray: WebAssembly scratch allocation failed (${n} f64 values)`);
        this.releases.push(() => wasm.freeF64(ptr, n));
        wasm.f64view(ptr, values.length).set(values);
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
    assert(rank <= limit, `${qualifiedName(op)}: ${backend} operations support at most ${limit} dimensions after coalescing (got ${rank})`);
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

type AffineForm = 0 | 1 | 2 | 3;

type CPUAffineParameter = { values: ReadonlyArray<number>; strides: ReadonlyArray<number> } | { array: CPUndarray; strides: ReadonlyArray<number> };

const cpuAffine = (dst: CPUndarray, src: CPUndarray, form: AffineForm, params: ReadonlyArray<CPUAffineParameter>, epsilon: number, range: readonly [number, number], op: string): void => {
    if (dst.numel === 0) return;
    const none = dst.shape.map(() => 0);
    const c = coalesceDims(dst.shape, [src.stridesBytes, dst.stridesBytes, ...[0, 1, 2, 3].map((k) => params[k]?.strides ?? none)]);
    assertRank(c.shape.length, CPU_MAX_RANK, "CPU", op);
    withWasmScratch((scratch) => {
        const slots = [0, 1, 2, 3].flatMap((k) => {
            const q = params[k];
            if (!q) return [0, 0, 0];
            if ("values" in q) return [scratch.f64(q.values), q.values.length, 0];
            return [q.array.basePtrBytes, q.array.byteLength / 8, q.array.offsetBytes / 8];
        });
        const elements = c.strides.slice(2).flatMap((strides) => strides.map((stride) => stride / 8));
        const layout = scratch.u32([dst.offsetBytes, src.offsetBytes, ...slots, ...c.shape, ...c.strides[0]!, ...c.strides[1]!, ...elements]);
        checkWasmStatus(ndarrayf.affine(dst.basePtrBytes, dst.byteLength, src.basePtrBytes, src.byteLength, layout, c.shape.length, DTYPE_CODE[dst.dtype] | (DTYPE_CODE[src.dtype] << 4) | (form << 8), scratch.f64([epsilon, range[0], range[1]])), op);
    });
};

type ResizeSampling = { method: NdarrayResizeMethod; antialias: boolean; cubicCoefficient: number };

type ResizeGrid = { alignCorners: boolean } | { scale: number; offset: number };

type ResizeAxis = { axis: number; nIn: number; nOut: number; boundary: NdarrayResizeBoundary; grid: ResizeGrid };

type ResizeTable = { offsets: Int32Array; index: Int32Array; weight: Float64Array | Float32Array; maxTaps: number; words?: Uint32Array };

type ResizeLevel = ResizeAxis & { table: ResizeTable };

const RESIZE_BOUNDARIES: ReadonlyArray<string> = ["edge", "constant", "reflect", "symmetric", "wrap", "renormalize"];
const MAX_RESIZE_LEVELS = 3;
const RESIZE_WRITE_COST: Record<NdarrayResidency, number> = { cpu: 0.4, gpu: 6 };
const CPU_INTERMEDIATE_BYTES = 67_108_864; // 64 * 1024 * 1024

const nearestResizeIndex = (d: number, nIn: number, nOut: number): number => {
    const product = (2 * d + 1) * nIn, divisor = 2 * nOut;
    const quotient = Math.floor(product / divisor);
    const index = Number.isSafeInteger(product) ? ((quotient * divisor > product) ? quotient - 1 : quotient) : Number((BigInt(2 * d + 1) * BigInt(nIn)) / BigInt(divisor));
    return Math.min(index, nIn - 1);
};

const resizeCoordinate = (d: number, nIn: number, nOut: number, alignCorners: boolean): { i: number; t: number } => {
    if (alignCorners && nOut === 1) return { i: 0, t: 0 };
    const den = alignCorners ? nOut - 1 : 2 * nOut;
    const product = alignCorners ? d * (nIn - 1) : (2 * d + 1) * nIn;
    if (Number.isSafeInteger(product) && product + den <= Number.MAX_SAFE_INTEGER) {
        const num = alignCorners ? product : product - nOut;
        let i = Math.floor(num / den), r = num - i * den;
        if (r < 0) { i--; r += den; } else if (r >= den) { i++; r -= den; }
        return { i, t: r / den };
    }
    const num = alignCorners ? BigInt(d) * BigInt(nIn - 1) : BigInt(2 * d + 1) * BigInt(nIn) - BigInt(nOut), wide = BigInt(den);
    let i = num / wide, r = num - i * wide;
    if (r < 0n) { i -= 1n; r += wide; }
    return { i: Number(i), t: Number(r) / den };
};

const resampleCoordinate = (d: number, scale: number, offset: number): { i: number; t: number } => { const x = d * scale + offset, i = Math.floor(x); return { i, t: x - i }; };

const nearestResampleIndex = (d: number, scale: number, offset: number): number => { const { i, t } = resampleCoordinate(d, scale, offset); return (t >= 0.5) ? i + 1 : i; };

const linearWeight = (x: number): number => { x = Math.abs(x); return (x < 1) ? 1 - x : 0; };

const cubicWeight = (x: number, a: number): number => { x = Math.abs(x); if (x <= 1) return (x - 1) * ((a + 2) * x * x - x - 1); if (x < 2) return a * (x - 1) * (x - 2) * (x - 2); return 0; };

const resizeTaps = (i: number, t: number, fs: number, cubic: boolean, a: number, ks: Float64Array, ws: Float64Array): number => {
    const support = cubic ? 2 : 1;
    let n = 0;
    if (fs === 1) {
        if (t === 0) { ks[0] = i; ws[0] = 1; return 1; }
        for (let k = i - support + 1; k <= i + support; k++, n++) { const x = (k - i) - t; ks[n] = k; ws[n] = cubic ? cubicWeight(x, a) : linearWeight(x); }
        return n;
    }
    const center = i + t, reach = support * fs;
    for (let k = Math.ceil(center - reach), end = Math.floor(center + reach); k <= end; k++, n++) { const x = ((k - i) - t) / fs; ks[n] = k; ws[n] = cubic ? cubicWeight(x, a) : linearWeight(x); }
    return n;
};

class ResizeTableWriter {
    private readonly n: number;
    private readonly f32: boolean;
    private readonly op: string;
    private capacity: number = 0;
    private words: Uint32Array | undefined;
    private offsets: Int32Array;
    private index: Int32Array = new Int32Array(0);
    private weight: Float64Array | Float32Array = new Float64Array(0);
    private count: number = 0;
    private rows: number = 0;
    private maxTaps: number = 0;

    constructor(n: number, capacity: number, f32: boolean, op: string) {
        this.n = n;
        this.f32 = f32;
        this.op = op;
        this.offsets = new Int32Array(f32 ? 0 : n + 1);
        this.grow(Math.max(capacity, 1));
    }

    private grow(capacity: number): void {
        const { offsets, index, weight, count, n } = this;
        if (this.f32) {
            const words = new Uint32Array(n + 1 + 2 * capacity);
            words.set(offsets.subarray(0, this.rows + 1));
            this.words = words;
            this.offsets = new Int32Array(words.buffer, 0, n + 1);
            this.index = new Int32Array(words.buffer, 4 * (n + 1), capacity);
            this.weight = new Float32Array(words.buffer, 4 * (n + 1 + capacity), capacity);
        } else {
            this.index = new Int32Array(capacity);
            this.weight = new Float64Array(capacity);
        }
        this.index.set(index.subarray(0, count));
        this.weight.set(weight.subarray(0, count));
        this.capacity = capacity;
    }

    row(index: Int32Array, weight: Float64Array, taps: number): void {
        if (this.count + taps > this.capacity) {
            assert(this.count + taps <= 0x7FFFFFFF, `${opName(this.op)}: a resize tap table needs more than 2^31 - 1 taps`);
            this.grow(Math.min(Math.max(2 * this.capacity, this.count + taps), 0x7FFFFFFF));
        }
        const start = this.count;
        for (let j = 0; j < taps; j++) {
            const w = this.f32 ? Math.fround(weight[j]!) : weight[j]!;
            if (w === 0 && taps > 1) continue;
            this.index[this.count] = index[j]!;
            this.weight[this.count++] = w;
        }
        if (this.count - start === 1) this.weight[start] = 1;
        this.offsets[++this.rows] = this.count;
        this.maxTaps = Math.max(this.maxTaps, this.count - start);
    }

    finish(): ResizeTable {
        const { n, count, maxTaps } = this;
        if (!this.words) return { offsets: this.offsets, index: this.index.subarray(0, count), weight: this.weight.subarray(0, count), maxTaps };
        this.words.copyWithin(n + 1 + count, n + 1 + this.capacity, n + 1 + this.capacity + count);
        const words = this.words.subarray(0, n + 1 + 2 * count);
        return { offsets: this.offsets, index: this.index.subarray(0, count), weight: new Float32Array(words.buffer, 4 * (n + 1 + count), count), maxTaps, words };
    }
}

const buildResizeTable = (axis: ResizeAxis, sampling: ResizeSampling, f32: boolean, op: string): ResizeTable => {
    const { nIn, nOut, grid } = axis;
    const nearest = sampling.method === "nearest", cubic = sampling.method === "cubic", support = cubic ? 2 : 1, a = sampling.cubicCoefficient;
    const resample = "scale" in grid;
    const fs = !sampling.antialias ? 1 : resample ? Math.max(1, Math.abs(grid.scale)) : (nIn > nOut && nOut > 0) ? nIn / nOut : 1;
    const renormalize = axis.boundary === "renormalize", mode = axis.boundary as NdarrayPadMode;
    const map = (k: number): number => (k >= 0 && k < nIn) ? k : renormalize ? -1 : padSourceIndex(k, nIn, mode);
    const perRow = nearest ? 1 : (fs > 1) ? Math.floor(2 * support * fs) + 2 : 2 * support;
    const table = new ResizeTableWriter(nOut, Math.min(nOut * perRow, 1 << 20), f32, op);
    const ks = new Float64Array(perRow), ws = new Float64Array(perRow), ri = new Int32Array(perRow), rw = new Float64Array(perRow), slots = new Map<number, number>();
    for (let d = 0; d < nOut; d++) {
        let taps = 0;
        if (nearest) { ri[0] = resample ? map(nearestResampleIndex(d, grid.scale, grid.offset)) : nearestResizeIndex(d, nIn, nOut); rw[0] = 1; table.row(ri, rw, 1); continue; }
        const { i, t } = resample ? resampleCoordinate(d, grid.scale, grid.offset) : resizeCoordinate(d, nIn, nOut, grid.alignCorners);
        if (fs === 1 && t === 0) {
            ri[0] = map(i);
            rw[0] = 1;
            table.row(ri, rw, 1);
            continue;
        }
        if (fs === 1 && i - support + 1 >= 0 && i + support < nIn) {
            for (let k = i - support + 1; k <= i + support; k++) {
                const x = (k - i) - t, w = cubic ? cubicWeight(x, a) : linearWeight(x);
                if (w !== 0) { ri[taps] = k; rw[taps++] = w; }
            }
        } else {
            const raw = resizeTaps(i, t, fs, cubic, a, ks, ws), inside = ks[0]! >= 0 && ks[raw - 1]! < nIn, small = raw <= 16;
            if (!inside && !small) slots.clear();
            for (let j = 0; j < raw; j++) {
                const w = ws[j]!;
                if (w === 0) continue;
                let k = ks[j]!;
                if (!inside) {
                    if (renormalize) { if (k < 0 || k >= nIn) continue; }
                    else k = padSourceIndex(k, nIn, mode);
                    let slot = -1;
                    if (small) { for (let p = 0; p < taps; p++) if (ri[p] === k) { slot = p; break; } }
                    else slot = slots.get(k) ?? -1;
                    if (slot >= 0) { rw[slot]! += w; continue; }
                    if (!small) slots.set(k, taps);
                }
                ri[taps] = k;
                rw[taps++] = w;
            }
            let kept = 0;
            for (let p = 0; p < taps; p++) if (rw[p] !== 0) { ri[kept] = ri[p]!; rw[kept++] = rw[p]!; }
            taps = kept;
        }
        let sum = 0;
        for (let p = 0; p < taps; p++) sum += rw[p]!;
        if (renormalize && !(Number.isFinite(sum) && sum > 0)) { ri[0] = -1; rw[0] = 1; taps = 1; }
        else if (taps !== 1) {
            assert(taps > 1 && Number.isFinite(sum) && sum > 0, "internal error: degenerate resize tap row");
            for (let p = 0; p < taps; p++) rw[p]! /= sum;
        }
        table.row(ri, rw, taps);
    }
    return table.finish();
};

const isIdentityAxis = (axis: ResizeAxis): boolean => axis.nIn === axis.nOut && (!("scale" in axis.grid) || (axis.grid.scale === 1 && axis.grid.offset === 0));

const isIdentityTable = (table: ResizeTable, nIn: number): boolean => table.offsets.length === nIn + 1 && table.maxTaps === 1 && table.index.every((k, d) => k === d);

const resizeShapes = (shape: ReadonlyArray<number>, passes: ReadonlyArray<ReadonlyArray<ResizeLevel>>): number[][] => {
    const out: number[][] = [];
    let current = shape.slice();
    for (const levels of passes) {
        current = current.slice();
        for (const level of levels) current[level.axis] = level.nOut;
        out.push(current);
    }
    return out;
};

type ResizePlan = { passes: ResizeLevel[][] } | { blocked: number[] };

const planResize = (levels: ReadonlyArray<ResizeLevel>, shape: ReadonlyArray<number>, writeCost: number, elementBytes: number, fits: (shape: ReadonlyArray<number>) => boolean, budget: number = Infinity): ResizePlan => {
    const n = levels.length, taps = levels.map((level) => level.table.index.length / level.nOut);
    const shapes = new Array<number[]>(n + 1);
    shapes[n] = shape.slice();
    for (let i = n - 1; i >= 0; i--) { shapes[i] = shapes[i + 1]!.slice(); shapes[i]![levels[i]!.axis] = levels[i]!.nOut; }
    const out = shapes.map((s) => numelFromShape(s));
    const usable = shapes.map((s, i) => i === 0 || i === n || fits(s));
    const bytes = out.map((count, i) => (i === 0 || i === n) ? 0 : count * elementBytes);
    const peak = new Array<number>(n + 1).fill(Infinity);
    peak[n] = 0;
    for (let i = n - 1; i >= 0; i--) {
        if (!usable[i]) continue;
        for (let k = 1; k <= Math.min(MAX_RESIZE_LEVELS, n - i); k++) peak[i] = Math.min(peak[i]!, Math.max(bytes[i]! + bytes[i + k]!, peak[i + k]!));
    }
    if (peak[0] === Infinity) {
        let i = 1;
        while (usable.slice(i, i + MAX_RESIZE_LEVELS).some((u) => u)) i++;
        const run = shapes.slice(i, i + MAX_RESIZE_LEVELS);
        return { blocked: run.reduce((a, b) => (numelFromShape(b) < numelFromShape(a)) ? b : a) };
    }
    const limit = Math.max(budget, peak[0]!);
    const cost = new Array<number>(n + 1).fill(Infinity), size = new Array<number>(n).fill(1);
    cost[n] = 0;
    for (let i = n - 1; i >= 0; i--) {
        if (!usable[i]) continue;
        for (let k = 1, product = 1; k <= Math.min(MAX_RESIZE_LEVELS, n - i); k++) {
            product *= taps[i + k - 1]!;
            const total = out[i]! * (product + writeCost) + cost[i + k]!;
            if (bytes[i]! + bytes[i + k]! <= limit && total <= cost[i]!) { cost[i] = total; size[i] = k; }
        }
    }
    const passes: ResizeLevel[][] = [];
    for (let i = 0; i < n; i += size[i]!) passes.unshift(levels.slice(i, i + size[i]!));
    return { passes };
};

const cpuResize = (dst: CPUndarray, src: CPUndarray, levels: ReadonlyArray<ResizeLevel>, weighted: boolean, value: ComplexScalar, constant: Uint32Array, op: string): void => {
    if (dst.numel === 0) return;
    const keep = dst.shape.map((_, i) => levels.some((level) => level.axis === i));
    const c = coalesceDims(dst.shape, [src.stridesBytes, dst.stridesBytes], keep);
    assertRank(c.shape.length, CPU_MAX_RANK, "CPU", op);
    let rows = 0, taps = 0;
    for (const { table } of levels) { rows += table.offsets.length; taps += table.index.length; }
    const index = new Int32Array(rows + taps + 4), weight = new Float64Array(taps + 2);
    let at = 0, tap = 0;
    for (const { table } of levels) {
        index.set(table.offsets, at);
        index.set(table.index, rows + tap);
        weight.set(table.weight, tap);
        at += table.offsets.length;
        tap += table.index.length;
    }
    index.set(new Int32Array(constant.buffer, constant.byteOffset, 4), rows + taps);
    weight[taps] = value[0];
    weight[taps + 1] = value[1];
    withWasmScratch((scratch) => {
        const layout = scratch.u32([dst.offsetBytes, src.offsetBytes, levels.length, ...levels.flatMap((level) => [c.axes[level.axis]!, src.shape[level.axis]!, level.table.index.length]), ...c.shape, ...c.strides[0]!, ...c.strides[1]!]);
        const srcLength = src.numel === 0 ? 0 : src.byteLength;
        checkWasmStatus(ndarrayf.resize(dst.basePtrBytes, dst.byteLength, srcLength === 0 ? 0 : src.basePtrBytes, srcLength, layout, c.shape.length, DTYPE_CODE[dst.dtype] | (DTYPE_CODE[src.dtype] << 4) | (weighted ? 0x100 : 0), scratch.u32(index), scratch.f64(weight)), op);
    });
};

type ReduceOp = "sum" | "prod" | "mean" | "var" | "std" | "min" | "max" | "argmin" | "argmax" | "minMax" | "varMean" | "stdMean";

type ReduceOptions = {
    axes?: number | readonly number[];
    axis?: number;
    keepDims?: boolean;
    dtype?: DType;
    nan?: NdarrayNaNMode;
    overflow?: NdarrayOverflowMode;
    ddof?: number;
    encoder?: GPUCommandEncoder;
    out?: unknown;
    label?: string;
    copySrc?: boolean;
    copyDst?: boolean;
    usage?: GPUBufferUsageFlags;
};

export type ReduceSpec = {
    op: ReduceOp;
    src: DType;
    dtypes: readonly DType[];
    omit: boolean;
    saturate: boolean;
    ddof: number;
    axes: number[];
    shape: number[];
    empty: boolean;
};

const REDUCE_OP_CODE: Record<ReduceOp, number> = { sum: 0, prod: 1, mean: 2, var: 3, std: 4, min: 5, max: 6, argmin: 7, argmax: 8, minMax: 9, varMean: 10, stdMean: 11 };
const REDUCE_ORDERED: ReadonlySet<ReduceOp> = new Set<ReduceOp>(["min", "max", "argmin", "argmax", "minMax"]);
const REDUCE_VARIANCE: ReadonlySet<ReduceOp> = new Set<ReduceOp>(["var", "std", "varMean", "stdMean"]);
const REDUCE_ARG: ReadonlySet<ReduceOp> = new Set<ReduceOp>(["argmin", "argmax"]);
const REDUCE_OUTPUT_NAMES: Partial<Record<ReduceOp, readonly [string, string]>> = { minMax: ["min", "max"], varMean: ["var", "mean"], stdMean: ["std", "mean"] };

const complexOf = (dtype: DType): DType => (dtype === "f64") ? "c128" : "c64";

const defaultReduceDType = (op: ReduceOp, src: DType): DType => {
    const kind = dtypeInfo(src).kind;
    switch (op) {
        case "sum":
        case "prod":
            return (kind === "int") ? "i32" : (kind === "uint") ? "u32" : src;
        case "mean":
            return (kind === "int" || kind === "uint") ? "f32" : src;
        case "var":
        case "std":
        case "varMean":
        case "stdMean":
            return (src === "f64" || src === "c128") ? "f64" : "f32";
        case "argmin":
        case "argmax":
            return "u32";
        default:
            return src;
    }
};

const assertReduceDType = (op: ReduceOp, src: DType, dtype: DType): void => {
    const name = opName(op), kind = dtypeInfo(src).kind;
    dtypeInfo(dtype);
    if (op === "sum" || op === "prod") {
        if (kind === "complex") assert(isComplexDType(dtype), `${name}: a real dtype would discard the imaginary parts of ${src}; reduce compute.ndarray.real() or compute.ndarray.imag() views instead`);
        else if (kind === "float") assert(isFloatDType(dtype), `${name}: ${src} inputs can produce f32 or f64 (got ${dtype})`);
        else assert(!isComplexDType(dtype), `${name}: real inputs cannot produce complex outputs (got ${dtype}); cast() the result instead`);
        return;
    }
    if (op === "mean" && kind === "complex") { assert(isComplexDType(dtype), `${name}: ${src} inputs can produce c64 or c128 (got ${dtype})`); return; }
    assert(isFloatDType(dtype), `${name}: dtype must be f32 or f64 (got ${dtype})`);
};

const resolveReduce = (a: AnyNdarray, op: ReduceOp, options: ReduceOptions): ReduceSpec => {
    const name = opName(op), src = a.dtype, ndim = a.ndim;
    assert(typeof options === "object" && options !== null, `${name}: options must be an object`);
    const ordered = REDUCE_ORDERED.has(op), arg = REDUCE_ARG.has(op), variance = REDUCE_VARIANCE.has(op), complex = isComplexDType(src), integer = INTEGER_RANGE[src] !== null;
    assert(!(ordered && complex), `${name}: ${src} values have no ordering; reduce compute.ndarray.real() or compute.ndarray.imag() views instead`);
    assert(!(arg && options.axes !== undefined), `${name}: arg-reductions take a single axis, not axes`);
    assert(arg || options.axis === undefined, `${name}: use axes instead of axis`);
    const axes = arg ? ((options.axis === undefined) ? a.shape.map((_, i) => i) : [normalizeAxis(options.axis, ndim, name)]) : ((options.axes === undefined) ? a.shape.map((_, i) => i) : normalizeAxes(options.axes, ndim, name));
    axes.sort((x, y) => x - y);
    assert(options.keepDims === undefined || typeof options.keepDims === "boolean", `${name}: keepDims must be a boolean (got ${String(options.keepDims)})`);
    assert(options.nan === undefined || options.nan === "propagate" || options.nan === "omit", `${name}: nan must be "propagate" or "omit" (got ${String(options.nan)})`);
    assert(options.dtype === undefined || !ordered, `${name}: dtype is not an option because outputs ${arg ? "are u32 indices" : "keep the input dtype"}`);
    const dtype = options.dtype ?? defaultReduceDType(op, src);
    if (!ordered) assertReduceDType(op, src, dtype);
    const outputInteger = INTEGER_RANGE[dtype] !== null;
    if (options.overflow !== undefined) {
        assert(op === "sum" || op === "prod", `${name}: overflow applies only to integer outputs of sum`);
        assert(options.overflow === "wrap" || options.overflow === "saturate", `${name}: overflow must be "wrap" or "saturate" (got ${String(options.overflow)})`);
        assert(outputInteger && integer, `${name}: overflow applies only to integer outputs (got ${dtype})`);
        assert(op === "sum" || options.overflow === "wrap", `${name}: integer products always wrap, so overflow "saturate" is not supported`);
    }
    assert(variance || options.ddof === undefined, `${name}: ddof applies only to var, std, varMean, and stdMean`);
    const ddof = options.ddof ?? 0;
    assert(typeof ddof === "number" && Number.isFinite(ddof) && ddof >= 0, `${name}: ddof must be a finite number >= 0 (got ${String(ddof)})`);
    const shape: number[] = [], keepDims = options.keepDims ?? false;
    let count = 1;
    for (let i = 0; i < ndim; i++) {
        if (!axes.includes(i)) shape.push(a.shape[i]!);
        else { count *= a.shape[i]!; if (keepDims) shape.push(1); }
    }
    const outputs = numelFromShape(shape);
    assert(count <= 0xFFFFFFFF && outputs <= 0xFFFFFFFF && outputs * count <= 0xFFFFFFFF, `${name}: reductions support at most 2^32 - 1 input elements`);
    assert(!ordered || count > 0 || outputs === 0, `${name}: cannot reduce an empty array because ${op} has no identity`);
    const dtypes: readonly DType[] = (op === "minMax") ? [src, src] : (op === "varMean" || op === "stdMean") ? [dtype, complex ? complexOf(dtype) : dtype] : [dtype];
    return { op, src, dtypes, omit: options.nan === "omit" && !integer, saturate: op === "sum" && (options.overflow ?? "saturate") === "saturate", ddof, axes, shape, empty: count === 0 };
};

export const wholeArrayReduce = (op: "sum" | "min" | "max" | "argmin" | "argmax", a: Ndarray, dtype: DType, omit: boolean, saturate: boolean): ReduceSpec => ({ op, src: a.dtype, dtypes: [dtype], omit, saturate, ddof: 0, axes: a.shape.map((_, i) => i), shape: [], empty: a.numel === 0 });

const assertReduceGPU = (spec: ReduceSpec): void => {
    const { op, src, dtypes } = spec;
    if (REDUCE_ORDERED.has(op)) return;
    const name = opName(op), wide = (dtype: DType): boolean => dtype === "f64" || dtype === "c128";
    assert(!wide(src), `${name}: GPU ${op} computes in f32 and does not support ${src} inputs; use a CPU array or cast() to ${(src === "f64") ? "f32" : "c64"}`);
    const storageOnly = op === "sum" && INTEGER_RANGE[src] !== null && dtypes[0] === "f64";
    if (!storageOnly) for (const dtype of dtypes) assert(!wide(dtype), `${name}: GPU ${op} computes in f32 and does not support ${dtype} outputs${(op === "sum") ? " except for integer inputs written as f64" : ""}; use a CPU array or cast() the result`);
};

type ReduceAxes = { keptShape: number[]; keptStrides: number[]; reducedShape: number[]; reducedStrides: number[]; count: number };

const coalesceReduce = (a: Ndarray, axes: ReadonlyArray<number>, limit: number, backend: string, op: string): ReduceAxes => {
    const reduced = new Set(axes);
    const keptIndices = a.shape.map((_, i) => i).filter((i) => !reduced.has(i));
    const kept = coalesceDims(keptIndices.map((i) => a.shape[i]!), [keptIndices.map((i) => a.stridesBytes[i]!)]);
    const red = coalesceDims(axes.map((i) => a.shape[i]!), [axes.map((i) => a.stridesBytes[i]!)]);
    assertRank(kept.shape.length + red.shape.length, limit, backend, op);
    return { keptShape: kept.shape, keptStrides: kept.strides[0]!, reducedShape: red.shape, reducedStrides: red.strides[0]!, count: red.shape.reduce((n, d) => n * d, 1) };
};

const gpuRangesOverlap = (a: GPUndarray, b: GPUndarray): boolean => {
    if (a.buffer.buffer !== b.buffer.buffer || a.numel === 0 || b.numel === 0) return false;
    const start = (x: GPUndarray): number => x.buffer.offsetBytes + x.baseOffsetBytes + x.offsetBytes;
    return start(a) < start(b) + b.numel * b.bytesPerElement && start(b) < start(a) + a.numel * a.bytesPerElement;
};

const cpuReduce = (a: CPUndarray, spec: ReduceSpec): CPUndarray[] => {
    const { op, dtypes, shape } = spec;
    const outs: CPUndarray[] = [];
    try {
        for (const dtype of dtypes) outs.push(CPUndarray.empty(dtype, { shape }));
        const first = outs[0]!, second = outs[1];
        if (first.numel === 0) return outs;
        const axes = spec.empty ? null : coalesceReduce(a, spec.axes, CPU_MAX_RANK, "CPU", op);
        const dims = axes ? [...axes.keptShape, ...axes.reducedShape] : [...shape.filter((n) => n > 1), 0];
        const strides = axes ? [...axes.keptStrides, ...axes.reducedStrides] : dims.map(() => 0);
        const keptRank = axes ? axes.keptShape.length : dims.length - 1;
        const flags = dims.map((_, i) => (i < keptRank) ? 0 : 1);
        const codes = DTYPE_CODE[first.dtype] | (DTYPE_CODE[a.dtype] << 4) | (REDUCE_OP_CODE[op] << 8) | (spec.omit ? 0x1000 : 0) | (spec.saturate ? 0x2000 : 0) | (second ? (DTYPE_CODE[second.dtype] << 16) : 0);
        const srcLength = (spec.empty) ? 0 : a.byteLength;
        withWasmScratch((scratch) => {
            const layout = scratch.u32([first.offsetBytes, second?.offsetBytes ?? 0, axes ? a.offsetBytes : 0, ...dims, ...strides, ...flags]);
            checkWasmStatus(ndarrayf.reduce(first.basePtrBytes, first.byteLength, second?.basePtrBytes ?? 0, second?.byteLength ?? 0, srcLength === 0 ? 0 : a.basePtrBytes, srcLength, layout, dims.length, codes, scratch.f64([spec.ddof])), op);
        });
        return outs;
    } catch (error) { for (const out of outs) out.destroy(); throw error; }
};

const PARAM_WORDS_RETAINED = 262144;

const P_COUNT = 0, P_NDIM = 1, P_NUMEL = 2, P_SRC_OFFSET = 3, P_DST_OFFSET = 4, P_VALUE_LO = 5, P_VALUE_HI = 6, P_P0_OFFSET = 7, P_P1_OFFSET = 8, P_LEVEL_COUNT = 9, P_EPSILON = 10, P_VALUE_2 = 12, P_VALUE_3 = 13, P_SHAPE = 16, P_SRC_STRIDE = 24, P_DST_STRIDE = 32, P_SRC_SHAPE = 40, P_BEFORE = 48, P_LEVEL_DIM = 56, P_LEVEL_TABLE = 64, P_P0_STRIDE = 72, P_P1_STRIDE = 80, P_HEADER_WORDS = 88;

const assertResizeParams = (words: number, limit: number, op: string): void => {
    const bytes = (P_HEADER_WORDS + words) * 4;
    assert(bytes <= limit, `${opName(op)}: a ${bytes}-byte resize parameter table exceeds device.limits.maxStorageBufferBindingSize (${limit}); request larger maxStorageBufferBindingSize and maxBufferSize limits through the renderer's device descriptor`);
};

const REDUCE_PARAM_WORDS = 44;
const REDUCE_SHARED_MIN_ELEMENTS = 512;
const REDUCE_THREAD_MIN_OUTPUTS = 128;
const REDUCE_THREAD_MIN_ELEMENTS = 2097152;
const REDUCE_THREAD_CHUNK = 256;
const REDUCE_SHARED_CHUNK = 32768;
const REDUCE_SHARED_WORKGROUPS = 512;

const R_OUTPUTS = 0, R_CHUNKS = 1, R_CHUNK = 2, R_COUNT = 3, R_SRC_OFFSET = 4, R_DST_OFFSET = 5, R_KEPT = 6, R_REDUCED = 7, R_STATE_SRC = 8, R_STATE_DST = 9, R_MEAN = 10, R_DDOF_HI = 11, R_DDOF_LO = 12, R_SWAP = 13, R_SELECT = 14, R_BASE = 40, R_WALK_COUNT = 41, R_WALK_STEP = 42;

type ReducePlan = { shared: boolean; swap: boolean; chunk: number; chunks: number; walkCount: number; walkStep: number };

type ReduceEntry = "reduce" | "reduceShared" | "reducePartials";

const REDUCE_ENTRY_CODE: Record<ReduceEntry, number> = { reduce: 0, reduceShared: 1, reducePartials: 2 };

type ReduceConstants = { src: number; op: number; omit: number; write: number; dst?: number; output?: number; overflow?: number };

type ReduceResource = { buffer: StorageBuffer; offset: number; size: number };

type ReduceTarget = { out: GPUndarray; array: GPUndarray; resource: ReduceResource };

const planReduce = (axes: ReduceAxes, outputs: number): ReducePlan => {
    const count = axes.count, kept = axes.keptShape.length, reduced = axes.reducedShape.length;
    let walkAxis = kept - 1, walkStep = 1, reducedStride = Infinity;
    for (let d = kept - 1; d >= 0; d--) if (Math.abs(axes.keptStrides[d]!) < Math.abs(axes.keptStrides[walkAxis]!)) walkAxis = d;
    for (let d = walkAxis + 1; d < kept; d++) walkStep *= axes.keptShape[d]!;
    for (let d = 0; d < reduced; d++) reducedStride = Math.min(reducedStride, Math.abs(axes.reducedStrides[d]!));
    const outer = kept > 0 && Math.abs(axes.keptStrides[walkAxis]!) <= reducedStride;
    const total = outputs * count;
    const shared = count >= REDUCE_SHARED_MIN_ELEMENTS && !(outer && outputs >= REDUCE_THREAD_MIN_OUTPUTS && total >= REDUCE_THREAD_MIN_ELEMENTS);
    const chunk = shared ? Math.min(count, Math.max(REDUCE_SHARED_CHUNK, Math.ceil(total / REDUCE_SHARED_WORKGROUPS))) : (count < REDUCE_SHARED_MIN_ELEMENTS) ? count : Math.min(count, REDUCE_THREAD_CHUNK);
    return { shared, swap: outer, chunk, chunks: Math.ceil(count / chunk), walkCount: (kept > 0) ? axes.keptShape[walkAxis]! : 1, walkStep };
};

const reduceStateWords = (op: ReduceOp, src: DType, omit: boolean): number => {
    const floatState = op === "var" || op === "std" || op === "varMean" || op === "stdMean" || ((op === "sum" || op === "mean") && (isFloatDType(src) || isComplexDType(src)));
    const two = op === "minMax" || (floatState && isComplexDType(src));
    const counted = op === "argmin" || op === "argmax" || (op === "prod" && isComplexDType(src)) || (omit && floatState);
    return 2 + (two ? 2 : 0) + (counted ? 1 : 0);
};

const reduceIdentityBits = (op: ReduceOp, dtype: DType): ArrayLike<number> => {
    if (op === "sum") return new Uint32Array(4);
    if (op === "prod") return elementBits(dtype, isComplexDType(dtype) ? [1, 0] : 1);
    return (dtype === "c64") ? [0x7FC00000, 0x7FC00000, 0, 0] : [0x7FC00000, 0, 0, 0];
};

type GPUGather = {
    dst: GPUndarray;
    src: GPUndarray;
    entryPoint: "gather" | "resize";
    constants: Record<string, number>;
    srcStrides: ReadonlyArray<number>;
    keep?: ReadonlyArray<boolean>;
    srcShape?: ReadonlyArray<number>;
    before?: ReadonlyArray<number>;
    resizeLevels?: { axes: ReadonlyArray<number>; tables: ReadonlyArray<Uint32Array> };
    valueBits?: ArrayLike<number>;
};

export type GPUAffineParameter = { values: ReadonlyArray<number>; strides: ReadonlyArray<number> } | { array: GPUndarray; strides: ReadonlyArray<number> };

export type GPUAffine = {
    dst: GPUndarray;
    src: GPUndarray;
    srcStrides: ReadonlyArray<number>;
    form: 0 | 1 | 2 | 3;
    params: readonly [GPUAffineParameter, GPUAffineParameter];
    epsilon?: number;
    range?: readonly [r0: number, width: number];
};

export type GPUZScoreStatistics = { storage: StorageBuffer; count: number; dtype: DType; std: number; mean: number; min: number; max: number };

const F32_VALUE = new Float32Array(1), F32_BITS = new Uint32Array(F32_VALUE.buffer);

const f32Bits = (value: number): number => { F32_VALUE[0] = value; return F32_BITS[0]!; };

export class NdarrayGPUEngine {
    private readonly device: GPUDevice;
    private readonly queue: GPUQueue;
    private readonly scratch: ScratchAllocator;
    private readonly pipelines: Map<string, ComputePipeline> = new Map();
    private readonly reducePipelines: Map<number, ComputePipeline> = new Map();
    private readonly alignment: number;
    private readonly maxBindingBytes: number;
    private empty: StorageBuffer | null = null;
    private words: Uint32Array<ArrayBuffer> = new Uint32Array(P_HEADER_WORDS);

    constructor(device: GPUDevice, queue: GPUQueue, scratch: ScratchAllocator) {
        this.device = device;
        this.queue = queue;
        this.scratch = scratch;
        this.alignment = device.limits.minStorageBufferOffsetAlignment;
        this.maxBindingBytes = device.limits.maxStorageBufferBindingSize;
    }

    destroy(): void {
        this.pipelines.clear();
        this.reducePipelines.clear();
        this.empty = null;
    }

    private pipeline(entryPoint: "gather" | "resize" | "affine" | "zscore" | ReduceEntry, constants: Record<string, number>): ComputePipeline {
        const key = `${entryPoint}:${Object.keys(constants).sort().map((name) => `${name}=${constants[name]}`).join(",")}`;
        let pipeline = this.pipelines.get(key);
        if (!pipeline) {
            const entries = [
                storageBufferLayout({ binding: 0, readOnly: true }),
                storageBufferLayout({ binding: 1, readOnly: false }),
                storageBufferLayout({ binding: 2, readOnly: true })
            ];
            if (entryPoint === "affine") entries.push(storageBufferLayout({ binding: 3, readOnly: true }), storageBufferLayout({ binding: 4, readOnly: true }));
            pipeline = new ComputePipeline(this.device, {
                label: `compute.ndarray:${key}`,
                code: (entryPoint === "affine" || entryPoint === "zscore") ? NDARRAY_AFFINE_WGSL : (entryPoint === "gather" || entryPoint === "resize") ? ndarrayWGSL : NDARRAY_REDUCE_WGSL,
                entryPoint,
                constants,
                bindGroups: [{ label: "compute.ndarray:bg0", entries }]
            });
            this.pipelines.set(key, pipeline);
        }
        return pipeline;
    }

    assertArray(a: GPUndarray, op: string, label: string = "array"): void {
        a[ndarrayAssertAlive]();
        assert(a.buffer.device === this.device, () => `${qualifiedName(op)}: ${label} belongs to a different GPUDevice`);
    }

    binding(a: GPUndarray, op: string): { resource: { buffer: StorageBuffer; offset: number; size: number }; delta: number } {
        return this.rangeBinding(a.buffer, a.baseOffsetBytes, a.byteLength, op);
    }

    private rangeBinding(storage: StorageBuffer, baseOffsetBytes: number, byteLength: number, op: string): { resource: { buffer: StorageBuffer; offset: number; size: number }; delta: number } {
        if (byteLength === 0) {
            this.empty ??= new StorageBuffer(this.device, this.queue, { label: "compute.ndarray:empty", byteLength: 4, copyDst: false });
            return { resource: { buffer: this.empty, offset: 0, size: 4 }, delta: 0 };
        }
        const alignment = this.device.limits.minStorageBufferOffsetAlignment;
        const absolute = storage.offsetBytes + baseOffsetBytes;
        const start = absolute - (absolute % alignment);
        const delta = absolute - start;
        const offset = start - storage.offsetBytes;
        const size = alignTo(delta + byteLength, 4);
        try { validateStorageBufferRange(storage, offset, delta + byteLength, true); }
        catch { throw new Error(`${qualifiedName(op)}: the 4-byte-aligned binding range of an array extends past its StorageBuffer's logical range (odd-length external wrappers cannot be bound)`); }
        assert(size <= this.device.limits.maxStorageBufferBindingSize, () => `${qualifiedName(op)}: a ${size}-byte binding exceeds device.limits.maxStorageBufferBindingSize (${this.device.limits.maxStorageBufferBindingSize}); request larger maxStorageBufferBindingSize and maxBufferSize limits through the renderer's device descriptor`);
        return { resource: { buffer: storage, offset, size }, delta };
    }

    bindable(a: GPUndarray): boolean {
        if (a.numel === 0 || !a.isContiguousC) return false;
        const offset = a.baseOffsetBytes + a.offsetBytes;
        if ((a.buffer.offsetBytes + offset) % this.alignment !== 0) return false;
        const size = alignTo(a.numel * a.bytesPerElement, 4);
        if (size > this.maxBindingBytes) return false;
        if (offset + size <= a.buffer.byteLength) return true;
        try { validateStorageBufferRange(a.buffer, offset, a.numel * a.bytesPerElement, true); }
        catch { return false; }
        return true;
    }

    direct(a: GPUndarray): { buffer: StorageBuffer; offset: number; size: number } {
        return { buffer: a.buffer, offset: a.baseOffsetBytes + a.offsetBytes, size: alignTo(a.numel * a.bytesPerElement, 4) };
    }

    output(dtype: DType, shape: ReadonlyArray<number>, options: NdarrayGPUOptions, op: string): GPUndarray {
        const info = dtypeInfo(dtype);
        const bytes = alignTo(numelFromShape(shape) * info.bytesPerElement, 4);
        assert(bytes <= this.device.limits.maxBufferSize, () => `${qualifiedName(op)}: a ${bytes}-byte output exceeds device.limits.maxBufferSize (${this.device.limits.maxBufferSize}); request larger maxStorageBufferBindingSize and maxBufferSize limits through the renderer's device descriptor`);
        return GPUndarray.empty({ device: this.device, queue: this.queue }, dtype, { shape }, { label: options.label ?? qualifiedName(op), copySrc: options.copySrc ?? true, copyDst: options.copyDst ?? true, usage: options.usage });
    }

    tempStorage(byteLength: number, op: string): StorageBuffer {
        const bytes = alignTo(byteLength, 4);
        return wrapStorageBuffer(this.device, this.queue, this.scratch.acquire(bytes, `${qualifiedName(op)}:staging`), { byteLength: bytes });
    }

    temp(dtype: DType, shape: ReadonlyArray<number>, op: string): GPUndarray {
        return GPUndarray.wrap(this.tempStorage(numelFromShape(shape) * dtypeInfo(dtype).bytesPerElement, op), dtype, { shape });
    }

    stage(src: GPUndarray, commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, op: string): GPUndarray {
        const temp = this.temp(src.dtype, src.shape, op);
        this.copy(src, temp, commands, encoder, op);
        return temp;
    }

    copy(src: GPUndarray, dst: GPUndarray, commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, op: string): void {
        this.gather(commands, encoder, { dst, src, entryPoint: "gather", constants: castConstants(src.dtype, dst.dtype, ARITHMETIC_MODE), srcStrides: src.stridesBytes }, op);
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
        const levels = spec.resizeLevels, tables = levels?.tables ?? [];
        let length = P_HEADER_WORDS;
        for (const table of tables) length += table.length;
        const words = this.header(length);
        words[P_COUNT] = count;
        words[P_NDIM] = c.shape.length;
        words[P_NUMEL] = dst.numel;
        words[P_SRC_OFFSET] = srcBinding.delta + src.offsetBytes;
        words[P_DST_OFFSET] = dstOffset;
        words[P_VALUE_LO] = spec.valueBits?.[0] ?? 0;
        words[P_VALUE_HI] = spec.valueBits?.[1] ?? 0;
        words[P_VALUE_2] = spec.valueBits?.[2] ?? 0;
        words[P_VALUE_3] = spec.valueBits?.[3] ?? 0;
        words[P_LEVEL_COUNT] = levels ? levels.axes.length : 0;
        for (let i = 0; i < c.shape.length; i++) {
            const axis = kept.get(i);
            words[P_SHAPE + i] = c.shape[i]!;
            words[P_SRC_STRIDE + i] = c.strides[0]![i]! >>> 0;
            words[P_DST_STRIDE + i] = c.strides[1]![i]! >>> 0;
            words[P_SRC_SHAPE + i] = (axis !== undefined && spec.srcShape) ? spec.srcShape[axis]! : c.shape[i]!;
            words[P_BEFORE + i] = (axis !== undefined && spec.before) ? spec.before[axis]! : 0;
        }
        for (let l = 0, at = P_HEADER_WORDS; l < tables.length; at += tables[l]!.length, l++) {
            if (levels) { words[P_LEVEL_DIM + l] = c.axes[levels.axes[l]!]!; words[P_LEVEL_TABLE + l] = at; }
            words.set(tables[l]!, at);
        }
        const params = this.scratch.params(words, encoder);
        const pipeline = this.pipeline(spec.entryPoint, spec.constants);
        const bindGroup = pipeline.createBindGroup(0, { 0: srcBinding.resource, 1: dstBinding.resource, 2: params }, `${qualifiedName(op)}:bg`);
        commands.push({ pipeline, bindGroups: [bindGroup], workgroups: workgroupsFolded(count, 256, this.device.limits.maxComputeWorkgroupsPerDimension), label: qualifiedName(op) });
    }

    private header(length: number): Uint32Array<ArrayBuffer> {
        if (length > this.words.length && length <= PARAM_WORDS_RETAINED) this.words = new Uint32Array(Math.max(length, 2 * this.words.length));
        const words = (length <= this.words.length) ? this.words.subarray(0, length) : new Uint32Array(length);
        words.fill(0, 0, P_HEADER_WORDS);
        return words;
    }

    affine(commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, spec: GPUAffine, op: string): void {
        const { dst, src, params: [q0, q1] } = spec;
        if (dst.numel === 0) return;
        assert(dst.isContiguousC, "internal error: affine maps write C-contiguous outputs, addressed as offset + index × size");
        const c = coalesceDims(dst.shape, [spec.srcStrides, dst.stridesBytes, q0.strides, q1.strides]);
        assertRank(c.shape.length, GPU_MAX_RANK, "GPU", op);
        const srcBinding = this.binding(src, op);
        const dstBinding = this.binding(dst, op);
        const arrays = [q0, q1].flatMap((q) => ("array" in q) ? [q.array] : []);
        const paramDType = arrays[0]?.dtype ?? "f32";
        assert(arrays.every((a) => a.dtype === paramDType) && (paramDType === "f32" || dtypeInfo(paramDType).bytesPerElement < 4), "internal error: affine parameter bindings need one f32, 8-bit, or 16-bit dtype");
        const size = dst.bytesPerElement;
        const dstOffset = dstBinding.delta + dst.offsetBytes;
        const count = (size < 4) ? Math.floor((dstOffset + dst.numel * size - 1) / 4) - Math.floor(dstOffset / 4) + 1 : dst.numel;
        const tableLength = (("values" in q0) ? q0.values.length : 0) + (("values" in q1) ? q1.values.length : 0);
        const words = this.header(P_HEADER_WORDS + tableLength);
        words[P_COUNT] = count;
        words[P_NDIM] = c.shape.length;
        words[P_NUMEL] = dst.numel;
        words[P_SRC_OFFSET] = srcBinding.delta + src.offsetBytes;
        words[P_DST_OFFSET] = dstOffset;
        words[P_VALUE_LO] = f32Bits(spec.range?.[0] ?? 0);
        words[P_VALUE_HI] = f32Bits(spec.range?.[1] ?? 1);
        words[P_EPSILON] = f32Bits(spec.epsilon ?? 0);
        const table = new Float32Array(words.buffer, words.byteOffset + 4 * P_HEADER_WORDS, tableLength);
        const sources = [0, 0];
        const resources: Array<{ buffer: StorageBuffer; offset: number; size: number } | null> = [null, null];
        const [a0, a1] = [("array" in q0) ? q0.array : null, ("array" in q1) ? q1.array : null];
        let shared: { start: number; delta: number } | null = null;
        if (a0 && a1 && a0.buffer === a1.buffer) {
            const start = Math.min(a0.baseOffsetBytes, a1.baseOffsetBytes), end = Math.max(a0.baseOffsetBytes + a0.byteLength, a1.baseOffsetBytes + a1.byteLength);
            if (alignTo(end - start + this.alignment, 4) <= this.maxBindingBytes) {
                const binding = this.rangeBinding(a0.buffer, start, end - start, op);
                resources[0] = binding.resource;
                shared = { start, delta: binding.delta };
            }
        }
        let tableAt = P_HEADER_WORDS * 4;
        [q0, q1].forEach((q, i) => {
            if ("values" in q) { table.set(q.values, tableAt / 4 - P_HEADER_WORDS); words[P_P0_OFFSET + i] = tableAt; tableAt += 4 * q.values.length; return; }
            if (shared) { sources[i] = 1; words[P_P0_OFFSET + i] = shared.delta + q.array.baseOffsetBytes - shared.start + q.array.offsetBytes; return; }
            const binding = this.binding(q.array, op);
            sources[i] = i + 1;
            resources[i] = binding.resource;
            words[P_P0_OFFSET + i] = binding.delta + q.array.offsetBytes;
        });
        for (let i = 0; i < c.shape.length; i++) {
            words[P_SHAPE + i] = c.shape[i]!;
            words[P_SRC_STRIDE + i] = c.strides[0]![i]! >>> 0;
            words[P_P0_STRIDE + i] = c.strides[2]![i]! >>> 0;
            words[P_P1_STRIDE + i] = c.strides[3]![i]! >>> 0;
        }
        const params = this.scratch.params(words, encoder);
        const pipeline = this.pipeline("affine", { SRC_DTYPE: DTYPE_CODE[src.dtype], DST_DTYPE: DTYPE_CODE[dst.dtype], AFFINE_FORM: spec.form, AFFINE_P0: sources[0]!, AFFINE_P1: sources[1]!, PARAM_DTYPE: DTYPE_CODE[paramDType], OVERFLOW: 1, ROUNDING: 1 });
        const bindGroup = pipeline.createBindGroup(0, { 0: srcBinding.resource, 1: dstBinding.resource, 2: params, 3: resources[0] ?? params, 4: resources[1] ?? params }, `${qualifiedName(op)}:bg`);
        commands.push({ pipeline, bindGroups: [bindGroup], workgroups: workgroupsFolded(count, 256, this.device.limits.maxComputeWorkgroupsPerDimension), label: qualifiedName(op) });
    }

    zscore(commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, stats: GPUZScoreStatistics, out: GPUndarray, epsilon: number, op: string): void {
        const K = stats.count;
        assert(out.dtype === "f32" && out.numel === 2 * K && out.isContiguousC, "internal error: z-score parameters need a contiguous f32 [2, K] output");
        const srcBinding = this.rangeBinding(stats.storage, 0, stats.storage.byteLength, op);
        const dstBinding = this.binding(out, op);
        const words = this.header(P_HEADER_WORDS), delta = srcBinding.delta;
        words[P_COUNT] = K;
        words[P_SRC_OFFSET] = delta + stats.std;
        words[P_P0_OFFSET] = delta + stats.mean;
        words[P_VALUE_2] = delta + stats.min;
        words[P_VALUE_3] = delta + stats.max;
        words[P_DST_OFFSET] = dstBinding.delta + out.offsetBytes;
        words[P_EPSILON] = f32Bits(epsilon);
        const params = this.scratch.params(words, encoder);
        const pipeline = this.pipeline("zscore", { SRC_DTYPE: DTYPE_CODE[stats.dtype] });
        const bindGroup = pipeline.createBindGroup(0, { 0: srcBinding.resource, 1: dstBinding.resource, 2: params }, `${qualifiedName(op)}:bg`);
        commands.push({ pipeline, bindGroups: [bindGroup], workgroups: workgroupsFolded(K, 256, this.device.limits.maxComputeWorkgroupsPerDimension), label: qualifiedName(op) });
    }

    fill(commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, dst: GPUndarray, src: GPUndarray, bits: ArrayLike<number>, op: string): void {
        const count = dst.numel, size = dst.bytesPerElement, code = DTYPE_CODE[dst.dtype];
        for (let base = 0, batch = this.outputWindow(dst); base < count; base += batch) {
            const flat = dst[ndarrayView]([Math.min(batch, count - base)], [size], dst.offsetBytes + base * size);
            this.gather(commands, encoder, { dst: flat, src, entryPoint: "gather", constants: { SRC_DTYPE: code, DST_DTYPE: code, OPERATION: 1, PAD_MODE: 0 }, srcStrides: [0], keep: [true], srcShape: [0], before: [0], valueBits: bits }, op);
        }
    }

    private outputWindow(out: GPUndarray): number {
        const absolute = out.buffer.offsetBytes + out.baseOffsetBytes, limit = this.maxBindingBytes;
        if (alignTo(absolute % this.alignment + out.byteLength, 4) <= limit) return out.numel;
        return Math.max(1, Math.floor((limit - this.alignment) / out.bytesPerElement));
    }

    private reducePipeline(entryPoint: ReduceEntry, c: ReduceConstants): ComputePipeline {
        const key = REDUCE_ENTRY_CODE[entryPoint] | (c.src << 2) | ((c.dst ?? 0) << 6) | (c.op << 10) | (c.omit << 14) | (c.write << 15) | ((c.output ?? 0) << 16) | ((c.overflow ?? 0) << 20);
        let pipeline = this.reducePipelines.get(key);
        if (!pipeline) {
            const constants: Record<string, number> = { SRC_DTYPE: c.src, REDUCE_OP: c.op, REDUCE_OMIT: c.omit, REDUCE_WRITE: c.write };
            if (c.write === 1) { constants.DST_DTYPE = c.dst!; constants.REDUCE_OUTPUT = c.output!; constants.OVERFLOW = c.overflow!; }
            pipeline = this.pipeline(entryPoint, constants);
            this.reducePipelines.set(key, pipeline);
        }
        return pipeline;
    }

    private reduceDispatch(commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, entryPoint: ReduceEntry, constants: ReduceConstants, srcResource: ReduceResource, dstResource: ReduceResource, params: Uint32Array<ArrayBuffer>, invocations: number, op: string): void {
        const pipeline = this.reducePipeline(entryPoint, constants);
        const bindGroup = pipeline.createBindGroup(0, { 0: srcResource, 1: dstResource, 2: this.scratch.params(params, encoder) }, `${qualifiedName(op)}:bg`);
        commands.push({ pipeline, bindGroups: [bindGroup], workgroups: workgroupsFolded(invocations, 256, this.device.limits.maxComputeWorkgroupsPerDimension), label: qualifiedName(op) });
    }

    private reduceFinish(commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, target: ReduceTarget, op: string): void {
        if (target.array.dtype !== target.out.dtype) this.gather(commands, encoder, { dst: target.out, src: target.array, entryPoint: "gather", constants: castConstants("u32", target.out.dtype, { saturate: false, nearest: false }), srcStrides: target.array.stridesBytes }, op);
    }

    private reduceTemp(bytes: number, op: string): ReduceResource {
        const storage = this.tempStorage(bytes, op);
        return { buffer: storage, offset: 0, size: storage.byteLength };
    }

    private reduceBatch(K: number, bytesPerOutput: number, outs: ReadonlyArray<GPUndarray>, op: string): number {
        const bindable = this.reduceBindable();
        assert(bytesPerOutput <= bindable, () => `${qualifiedName(op)}: a ${bytesPerOutput}-byte temporary for one output exceeds device.limits.maxStorageBufferBindingSize (${this.maxBindingBytes}) or device.limits.maxBufferSize (${this.device.limits.maxBufferSize}); request larger maxStorageBufferBindingSize and maxBufferSize limits through the renderer's device descriptor`);
        let batch = (bytesPerOutput > 0) ? Math.min(K, Math.floor(bindable / bytesPerOutput)) : K;
        for (const out of outs) batch = Math.min(batch, this.outputWindow(out));
        return batch;
    }

    private reduceBindable(): number {
        return Math.min(this.device.limits.maxBufferSize, this.maxBindingBytes);
    }

    reduce(commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, spec: ReduceSpec, src: GPUndarray, outs: ReadonlyArray<GPUndarray>, op: string): void {
        const first = outs[0]!, K = first.numel;
        if (K === 0) return;
        if (spec.empty) { for (const out of outs) this.fill(commands, encoder, out, src, reduceIdentityBits((out === first) ? spec.op : "mean", out.dtype), op); return; }
        const axes = coalesceReduce(src, spec.axes, GPU_MAX_RANK, "GPU", op);
        const plan = planReduce(axes, K), C = plan.chunks, kept = axes.keptShape.length, reduced = axes.reducedShape.length;
        const words = reduceStateWords(spec.op, spec.src, spec.omit), stateBytes = 4 * words;
        const variance = spec.op === "var" || spec.op === "std" || spec.op === "varMean" || spec.op === "stdMean", both = spec.op === "minMax";
        const narrow = outs.some((out) => out.bytesPerElement < 4);
        const stateful = variance || both || C > 1;
        const batch = this.reduceBatch(K, Math.max(variance ? (1 + C) * stateBytes : stateful ? C * stateBytes : 0, narrow ? 4 : 0), outs, op);
        const srcBinding = this.binding(src, op);
        const params = new Uint32Array(REDUCE_PARAM_WORDS);
        params[R_CHUNK] = plan.chunk;
        params[R_COUNT] = axes.count;
        params[R_SRC_OFFSET] = srcBinding.delta + src.offsetBytes;
        params[R_KEPT] = kept;
        params[R_REDUCED] = reduced;
        params[R_SWAP] = plan.swap ? 1 : 0;
        params[R_WALK_COUNT] = plan.walkCount;
        params[R_WALK_STEP] = (batch === K) ? plan.walkStep : 1;
        for (let i = 0; i < kept; i++) { params[P_SHAPE + i] = axes.keptShape[i]!; params[P_SRC_STRIDE + i] = axes.keptStrides[i]! >>> 0; }
        for (let i = 0; i < reduced; i++) { params[P_SHAPE + kept + i] = axes.reducedShape[i]!; params[P_SRC_STRIDE + kept + i] = axes.reducedStrides[i]! >>> 0; }
        if (variance) {
            const ddofHi = Math.fround(spec.ddof), bits = new Uint32Array(new Float32Array([ddofHi, Math.fround(spec.ddof - ddofHi)]).buffer);
            params[R_DDOF_HI] = bits[0]!;
            params[R_DDOF_LO] = bits[1]!;
        }
        const entry = plan.shared ? "reduceShared" : "reduce", perOutput = plan.shared ? C * 256 : C;
        const code = DTYPE_CODE[spec.src], omit = spec.omit ? 1 : 0, opCode = REDUCE_OP_CODE[spec.op], overflow = (spec.saturate && INTEGER_RANGE[spec.src] !== null) ? 1 : 0;
        const dispatch = (entryPoint: ReduceEntry, c: ReduceConstants, from: ReduceResource, to: ReduceResource, invocations: number): void => this.reduceDispatch(commands, encoder, entryPoint, c, from, to, params, invocations, op);
        const final = (target: ReduceTarget, reduceOp: number): ReduceConstants => ({ src: code, op: reduceOp, omit, write: 1, dst: DTYPE_CODE[target.array.dtype], output: DTYPE_CODE[target.out.dtype], overflow });
        const states = variance ? this.reduceTemp((batch + batch * C) * stateBytes, op) : stateful ? this.reduceTemp(batch * C * stateBytes, op) : null;
        const partials = (variance && C > 1) ? this.reduceTemp(batch * C * stateBytes, op) : (both && C > 1) ? this.reduceTemp(batch * stateBytes, op) : null;
        const narrowStorage = narrow ? this.tempStorage(batch * 4, op) : null;
        const center = (spec.op === "var" || spec.op === "varMean") ? REDUCE_OP_CODE.var : REDUCE_OP_CODE.std, meanCode = REDUCE_OP_CODE.mean;
        for (let base = 0; base < K; base += batch) {
            const count = Math.min(batch, K - base);
            const targetOf = (out: GPUndarray): ReduceTarget => {
                const window = (count === K) ? out : out[ndarrayView]([count], [out.bytesPerElement], out.offsetBytes + base * out.bytesPerElement);
                const array = (out.bytesPerElement < 4) ? GPUndarray.wrap(narrowStorage!, "u32", { shape: window.shape }) : window;
                const binding = this.binding(array, op);
                params[R_DST_OFFSET] = binding.delta + array.offsetBytes;
                return { out: window, array, resource: binding.resource };
            };
            params[R_BASE] = base;
            params[R_OUTPUTS] = count;
            params[R_CHUNKS] = C;
            params[R_STATE_SRC] = 0;
            params[R_STATE_DST] = 0;
            if (variance) {
                if (C === 1) dispatch(entry, { src: code, op: meanCode, omit, write: 0 }, srcBinding.resource, states!, count * perOutput);
                else {
                    dispatch(entry, { src: code, op: meanCode, omit, write: 0 }, srcBinding.resource, partials!, count * perOutput);
                    dispatch("reducePartials", { src: code, op: meanCode, omit, write: 0 }, partials!, states!, count);
                }
                params[R_STATE_DST] = count * words;
                dispatch(entry, { src: code, op: center, omit, write: 0 }, srcBinding.resource, states!, count * perOutput);
                params[R_STATE_SRC] = count * words;
                const target = targetOf(first);
                dispatch("reducePartials", final(target, center), states!, target.resource, count);
                this.reduceFinish(commands, encoder, target, op);
                if (outs[1]) {
                    const meanTarget = targetOf(outs[1]);
                    params[R_STATE_SRC] = 0;
                    params[R_CHUNKS] = 1;
                    dispatch("reducePartials", final(meanTarget, meanCode), states!, meanTarget.resource, count);
                    this.reduceFinish(commands, encoder, meanTarget, op);
                }
            } else if (both) {
                dispatch(entry, { src: code, op: opCode, omit, write: 0 }, srcBinding.resource, states!, count * perOutput);
                if (C > 1) {
                    dispatch("reducePartials", { src: code, op: opCode, omit, write: 0 }, states!, partials!, count);
                    params[R_CHUNKS] = 1;
                }
                for (let select = 0; select < 2; select++) {
                    const target = targetOf(outs[select]!);
                    params[R_SELECT] = select;
                    dispatch("reducePartials", final(target, opCode), (C > 1) ? partials! : states!, target.resource, count);
                    this.reduceFinish(commands, encoder, target, op);
                }
            } else {
                const target = targetOf(first);
                if (C === 1) dispatch(entry, final(target, opCode), srcBinding.resource, target.resource, count * perOutput);
                else {
                    dispatch(entry, { src: code, op: opCode, omit, write: 0 }, srcBinding.resource, states!, count * perOutput);
                    dispatch("reducePartials", final(target, opCode), states!, target.resource, count);
                }
                this.reduceFinish(commands, encoder, target, op);
            }
        }
    }

    submit(commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, label: string | undefined, op: string): void {
        const target = encoder ?? this.device.createCommandEncoder({ label: label ?? qualifiedName(op) });
        if (commands.length > 0) encodeDispatchBatchWithLimit(target, commands, label ?? qualifiedName(op), this.device.limits.maxComputeWorkgroupsPerDimension);
        if (!encoder) this.queue.submit([target.finish()]);
    }
}

const castConstants = (src: DType, dst: DType, mode: IntMode): Record<string, number> => {
    const integerDestination = INTEGER_RANGE[dst] !== null && src !== dst;
    return { SRC_DTYPE: DTYPE_CODE[src], DST_DTYPE: DTYPE_CODE[dst], OPERATION: 0, OVERFLOW: integerDestination && !mode.saturate ? 0 : 1, ROUNDING: integerDestination && mode.nearest ? 1 : 0 };
};

const assertCast = (src: DType, dst: DType, residency: NdarrayResidency, op: string): void => {
    assert(!isComplexDType(src) || isComplexDType(dst), `${opName(op)}: casting ${src} to ${dst} would discard imaginary parts; take compute.ndarray.real() or compute.ndarray.imag() first, then cast()`);
    if (residency === "cpu") return;
    const integers = INTEGER_RANGE[src] !== null || INTEGER_RANGE[dst] !== null;
    assert(!((src === "f64") !== (dst === "f64") && integers), `${opName(op)}: f64 <-> integer casts are not supported on the GPU; cast through f32 or use a CPU array`);
    assert(!((src === "c128") !== (dst === "c128") && integers), `${opName(op)}: c128 <-> integer casts are not supported on the GPU; cast through f32 or c64, or use a CPU array`);
};

const assertRealOperation = (dtypes: ReadonlyArray<DType>, op: string): void => { assert(!dtypes.some(isComplexDType), `${opName(op)}: complex dtypes (c64, c128) are not supported`); };

const assertCPUOptions = (options: NdarrayGPUOptions & { encoder?: unknown; out?: unknown }, op: string): void => { assert(!hasGPUOptions(options), `${opName(op)}: GPU options (encoder, out, label, copySrc, copyDst, usage) are not supported for CPU arrays`); };

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

type NormalizeParameter = { values: number[]; axis: number } | { array: AnyNdarray; strides: number[] };

type NormalizePlan = {
    method: NdarrayNormalizeMethod | null;
    meanStd: boolean;
    params: readonly [NormalizeParameter, NormalizeParameter] | null;
    axes: number[];
    omit: boolean;
    ddof: number;
    epsilon: number;
    range: readonly [number, number];
    dtype: DType;
};

const NORMALIZE_PARAMETERS = ["scale", "offset", "mean", "std"] as const;

const resolveNormalize = (a: AnyNdarray, options: NormalizeOptionBag, assertArray: (p: AnyNdarray, label: string) => void, op: string): NormalizePlan => {
    const name = opName(op), ndim = a.ndim, gpu = a instanceof GPUndarray;
    const method = options.method;
    const meanStd = options.mean !== undefined || options.std !== undefined;
    const scaleOffset = options.scale !== undefined || options.offset !== undefined;
    if (method !== undefined) {
        assert(!meanStd && !scaleOffset, `${name}: method computes its own parameters; do not also pass scale, offset, mean, or std`);
        assert(method !== "percentile" && method !== "robust", `${name}: method "${String(method)}" is not supported yet; use "minmax" or "zscore"`);
        assert(method === "minmax" || method === "zscore", `${name}: method must be "minmax" or "zscore" (got ${String(method)})`);
    } else {
        assert(!(meanStd && scaleOffset), `${name}: use either { scale, offset } or { mean, std }, not both`);
        assert(meanStd || scaleOffset, `${name}: provide scale and/or offset, or mean and std`);
        if (meanStd) assert(options.mean !== undefined && options.std !== undefined, `${name}: { mean, std } requires both mean and std`);
    }
    for (const key of ["axes", "nan", "epsilon"] as const) assert(method !== undefined || options[key] === undefined, `${name}: ${key} applies only to the statistics methods ("minmax" and "zscore")`);
    assert(options.ddof === undefined || method === "zscore", `${name}: ddof applies only to method "zscore"`);
    assert(options.range === undefined || method === "minmax", `${name}: range applies only to method "minmax"`);
    assert(options.axis === undefined || options.axes === undefined, `${name}: use either axis (the one axis the statistics vary along) or axes (the axes they are computed over), not both`);
    const dtype = options.dtype ?? (isFloatDType(a.dtype) ? a.dtype : "f32");
    dtypeInfo(dtype);
    const plan: NormalizePlan = { method: (method as NdarrayNormalizeMethod | undefined) ?? null, meanStd, params: null, axes: [], omit: false, ddof: 0, epsilon: 0, range: [0, 1], dtype };
    if (plan.method) {
        const axes = (options.axis !== undefined) ? a.shape.map((_, i) => i).filter((i) => i !== normalizeAxis(options.axis!, ndim, name)) : (options.axes !== undefined) ? normalizeAxes(options.axes, ndim, name) : a.shape.map((_, i) => i);
        plan.axes = axes.sort((x, y) => x - y);
        assert(options.nan === undefined || options.nan === "propagate" || options.nan === "omit", `${name}: nan must be "propagate" or "omit" (got ${String(options.nan)})`);
        plan.omit = options.nan === "omit" && INTEGER_RANGE[a.dtype] === null;
        const ddof = options.ddof ?? 0;
        assert(typeof ddof === "number" && Number.isFinite(ddof) && ddof >= 0, `${name}: ddof must be a finite number >= 0 (got ${String(ddof)})`);
        const epsilon = options.epsilon ?? 0;
        assert(typeof epsilon === "number" && Number.isFinite(epsilon) && epsilon >= 0, `${name}: epsilon must be a finite number >= 0 (got ${String(epsilon)})`);
        const range = (options.range ?? [0, 1]) as readonly unknown[];
        assert(Array.isArray(range) && range.length === 2 && range.every((v) => typeof v === "number" && Number.isFinite(v)), `${name}: range must be a [min, max] pair of finite numbers`);
        const [r0, r1] = range as [number, number];
        assert(r0 < r1, `${name}: range[0] must be less than range[1] (got [${r0}, ${r1}])`);
        Object.assign(plan, { ddof, epsilon, range: [r0, r1] });
        if (gpu) {
            const [f0, f1] = [Math.fround(r0), Math.fround(r1)], width = Math.fround(f1 - f0);
            assert(Number.isFinite(width) && f0 < f1 && Number.isFinite(Math.fround(epsilon)), `${name}: range and epsilon must stay finite when rounded to f32 for the GPU, with range[0] < range[1] (got [${f0}, ${f1}] and ${Math.fround(epsilon)})`);
        }
        return plan;
    }
    const labels = meanStd ? ["mean", "std"] as const : ["scale", "offset"] as const;
    const raw = meanStd ? [options.mean, options.std] : [options.scale ?? 1, options.offset ?? 0];
    const axis = (options.axis === undefined) ? -1 : normalizeAxis(options.axis, ndim, name);
    const isArray = (v: unknown): v is AnyNdarray => v instanceof CPUndarray || v instanceof GPUndarray;
    const params = raw.map((value, i) => {
        if (!isArray(value)) return { values: normalizeParameter(value as NdarrayParameter, labels[i]!, op), axis: -1 };
        const label = labels[i]!, kind = gpu ? "GPUndarray" : "CPUndarray";
        assert(value.residency === a.residency, `${name}: ${label} must be a ${kind} like the input array (got a ${gpu ? "CPUndarray" : "GPUndarray"}); ndarray parameters keep the input's residency, so move them with compute.ndarray.${gpu ? "toGPU" : "toCPU"}() first`);
        assertArray(value, label);
        assertRealOperation([value.dtype], op);
        assert(!gpu || value.dtype !== "f64", `${name}: GPU normalize computes in f32 and does not support f64 parameters; cast() ${label} to f32 or use CPU arrays`);
        assert(axis < 0, `${name}: axis applies only to number-array parameters; ndarray parameters broadcast against the input, so reshape() or expandDims() ${label}, or compute it with keepDims: true`);
        return { array: value, strides: broadcastStrides(value.shape, value.stridesBytes, a.shape, `${name}: ${label}`) };
    }) as [NormalizeParameter, NormalizeParameter];
    const numbers = params.flatMap((q) => ("values" in q) ? [q] : []);
    const vector = numbers.some((q) => q.values.length > 1);
    assert(!vector || axis >= 0, `${name}: axis is required when a parameter has more than one value`);
    const length = vector ? a.shape[axis]! : 1;
    params.forEach((q, i) => {
        if (!("values" in q)) return;
        assert(q.values.length === 1 || q.values.length === length, `${name}: ${labels[i]} must have 1 or ${length} values (got ${q.values.length})`);
        if (q.values.length > 1) q.axis = axis;
    });
    if (meanStd && "values" in params[1]) assert(params[1].values.every((v) => v !== 0), `${name}: std must be nonzero`);
    if (gpu) {
        let finite = true;
        for (const q of numbers) for (const v of q.values) finite &&= Number.isFinite(Math.fround(v));
        const std = ("values" in params[1]) ? params[1].values : [];
        let nonzero = true;
        if (meanStd) for (const v of std) nonzero &&= Math.fround(v) !== 0;
        assert(finite && nonzero, `${name}: parameters must stay finite (and std nonzero) when rounded to f32 for the GPU`);
    }
    plan.params = params;
    return plan;
};

const statisticsSpec = (a: Ndarray, op: "stdMean" | "minMax", plan: NormalizePlan, dtype: DType, name: string): ReduceSpec => {
    const shape = a.shape.map((n, i) => plan.axes.includes(i) ? 1 : n);
    const count = plan.axes.reduce((n, i) => n * a.shape[i]!, 1), outputs = numelFromShape(shape);
    assert(count <= 0xFFFFFFFF && outputs <= 0xFFFFFFFF && outputs * count <= 0xFFFFFFFF, `${name}: statistics support at most 2^32 - 1 input elements`);
    return { op, src: a.dtype, dtypes: (op === "minMax") ? [a.dtype, a.dtype] : [dtype, dtype], omit: plan.omit, saturate: false, ddof: plan.ddof, axes: plan.axes, shape, empty: count === 0 };
};

const valueStrides = (q: { values: number[]; axis: number }, ndim: number, bytes: number): number[] => Array.from({ length: ndim }, (_, i) => (i === q.axis) ? bytes : 0);

export class NdarrayNamespace {
    private readonly device: GPUDevice;
    private readonly queue: GPUQueue;
    private readonly readback: ReadbackRing | null;
    private readonly scratch: ScratchAllocator;
    private readonly ownsScratch: boolean;
    private readonly gpu: NdarrayGPUEngine;
    private readonly ownsEngine: boolean;
    private readonly maxCPUIntermediateBytes: number;
    private destroyed: boolean = false;

    constructor(device: GPUDevice, queue: GPUQueue, readback: ReadbackRing | null = null, scratch?: ScratchAllocator, engine?: NdarrayGPUEngine, desc: NdarrayDescriptor = {}) {
        assert(!engine || scratch, "NdarrayNamespace: an injected engine requires the scratch allocator it was created with");
        const maxCPUIntermediateBytes = desc.maxCPUIntermediateBytes ?? CPU_INTERMEDIATE_BYTES;
        assert(Number.isSafeInteger(maxCPUIntermediateBytes) && maxCPUIntermediateBytes >= 0, `ndarray.maxCPUIntermediateBytes must be a safe integer >= 0 (got ${maxCPUIntermediateBytes})`);
        this.maxCPUIntermediateBytes = maxCPUIntermediateBytes;
        this.device = device;
        this.queue = queue;
        this.readback = readback;
        this.scratch = scratch ?? new ScratchAllocator(device, queue);
        this.ownsScratch = !scratch;
        this.gpu = engine ?? new NdarrayGPUEngine(device, queue, this.scratch);
        this.ownsEngine = !engine;
    }

    [Symbol.hasInstance](value: unknown): value is Ndarray {
        return value instanceof Ndarray;
    }

    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        if (this.ownsEngine) this.gpu.destroy();
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
        assertCast(a.dtype, dtype, a.residency, op);
        const mode = resolveIntMode(a.dtype, options, op);
        if (a instanceof CPUndarray) {
            assertCPUOptions(options, op);
            a[ndarrayAssertAlive]();
            const out = CPUndarray.empty(dtype, { shape: a.shape });
            try { cpuCopy(out, a, a.stridesBytes, mode, op); return out as T; }
            catch (error) { out.destroy(); throw error; }
        }
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
        assertCast(src.dtype, dst.dtype, dst.residency, op);
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
        const op = "normalize", name = opName(op);
        this.assertAlive(op);
        assertNdarray(a, op);
        assert(typeof options === "object" && options !== null, `${name}: options are required`);
        assertRealOperation([a.dtype, options.dtype ?? a.dtype], op);
        const plan = resolveNormalize(a, options as NormalizeOptionBag, (p, label) => { if (p instanceof GPUndarray) this.assertGPUArray(p, op, label); else p[ndarrayAssertAlive](); }, op);
        const dtype = plan.dtype;
        if (a instanceof CPUndarray) {
            assertCPUOptions(options, op);
            a[ndarrayAssertAlive]();
            const out = CPUndarray.empty(dtype, { shape: a.shape });
            try { if (a.numel > 0) this.cpuNormalize(out, a, plan, op); return out as T; }
            catch (error) { out.destroy(); throw error; }
        }
        assert(a.dtype !== "f64" && dtype !== "f64", `${name}: GPU normalize computes in f32 and does not support f64 inputs or outputs; use a CPU array`);
        const gpu = a as GPUndarray;
        if (gpu.numel === 0) {
            this.assertGPUArray(gpu, op);
            return this.gpuOutput(dtype, gpu.shape, options, op).out as T;
        }
        if (plan.method) this.assertStatisticsBindings(gpu, plan, name);
        return this.gpuRun(gpu, dtype, gpu.shape, options, op, (commands, out, src) => this.gpuNormalize(commands, options.encoder, out, src, plan, op)) as T;
    }

    private cpuNormalize(out: CPUndarray, a: CPUndarray, plan: NormalizePlan, op: string): void {
        const name = opName(op), temps: CPUndarray[] = [];
        const f64 = (x: CPUndarray): CPUndarray => {
            if (x.dtype === "f64") return x;
            const temp = CPUndarray.empty("f64", { shape: x.shape });
            temps.push(temp);
            cpuCopy(temp, x, x.stridesBytes, ARITHMETIC_MODE, op);
            return temp;
        };
        const broadcast = (x: CPUndarray): CPUAffineParameter => ({ array: x, strides: broadcastStrides(x.shape, x.stridesBytes, a.shape, name) });
        try {
            if (!plan.method) {
                const params = plan.params!.map((q): CPUAffineParameter => ("values" in q) ? { values: q.values, strides: valueStrides(q, a.ndim, 8) } : broadcast(f64(q.array as CPUndarray)));
                cpuAffine(out, a, plan.meanStd ? 1 : 0, params, 0, [0, 1], op);
                return;
            }
            const [min, max] = cpuReduce(a, statisticsSpec(a, "minMax", plan, a.dtype, name));
            temps.push(min!, max!);
            const bounds = [broadcast(f64(min!)), broadcast(f64(max!))];
            if (plan.method === "minmax") { cpuAffine(out, a, 3, bounds, plan.epsilon, plan.range, op); return; }
            const [std, mean] = cpuReduce(a, statisticsSpec(a, "stdMean", plan, "f64", name));
            temps.push(std!, mean!);
            cpuAffine(out, a, 2, [broadcast(mean!), broadcast(std!), ...bounds], plan.epsilon, [0, 1], op);
        } finally { for (const temp of temps) temp.destroy(); }
    }

    private assertStatisticsBindings(a: GPUndarray, plan: NormalizePlan, name: string): void {
        const K = a.shape.reduce((n, d, i) => plan.axes.includes(i) ? n : n * d, 1), region = alignTo(K * a.bytesPerElement, 4);
        const bytes = (plan.method === "zscore") ? 8 * K + 2 * region : Math.max(2 * region, (a.bytesPerElement === 4 && a.dtype !== "f32") ? 8 * K : 0);
        const limit = Math.min(this.device.limits.maxStorageBufferBindingSize, this.device.limits.maxBufferSize);
        assert(bytes <= limit, `${name}: a ${bytes}-byte statistics temporary exceeds device.limits.maxStorageBufferBindingSize (${this.device.limits.maxStorageBufferBindingSize}) or device.limits.maxBufferSize (${this.device.limits.maxBufferSize}); request larger maxStorageBufferBindingSize and maxBufferSize limits through the renderer's device descriptor`);
    }

    private gpuNormalize(commands: ComputeDispatchCommand[], encoder: GPUCommandEncoder | undefined, out: GPUndarray, src: GPUndarray, plan: NormalizePlan, op: string): void {
        const name = opName(op), gpu = this.gpu;
        const broadcast = (x: GPUndarray): GPUAffineParameter => ({ array: x, strides: broadcastStrides(x.shape, x.stridesBytes, src.shape, name) });
        gpu.binding(src, op);
        gpu.binding(out, op);
        if (!plan.method) {
            const params = plan.params!.map((q): GPUAffineParameter => {
                if ("values" in q) return { values: q.values, strides: valueStrides(q, src.ndim, 4) };
                const array = q.array as GPUndarray;
                if (array.dtype !== "f32") { const temp = gpu.temp("f32", array.shape, op); gpu.copy(array, temp, commands, encoder, op); return broadcast(temp); }
                return broadcast((array.buffer.buffer === out.buffer.buffer) ? gpu.stage(array, commands, encoder, op) : array);
            }) as [GPUAffineParameter, GPUAffineParameter];
            gpu.affine(commands, encoder, { dst: out, src, srcStrides: src.stridesBytes, form: plan.meanStd ? 1 : 0, params }, op);
            return;
        }
        const shape = src.shape.map((n, i) => plan.axes.includes(i) ? 1 : n), K = numelFromShape(shape);
        const size = src.bytesPerElement, region = alignTo(K * size, 4), zscore = plan.method === "zscore";
        const base = zscore ? 8 * K : 0;
        const storage = gpu.tempStorage(base + 2 * region, op);
        const view = (dtype: DType, offset: number): GPUndarray => GPUndarray.wrap(storage, dtype, { shape }, offset);
        const [min, max] = [view(src.dtype, base), view(src.dtype, base + region)];
        gpu.reduce(commands, encoder, statisticsSpec(src, "minMax", plan, src.dtype, name), src, [min, max], op);
        const epsilon = Math.fround(plan.epsilon);
        if (zscore) {
            gpu.reduce(commands, encoder, statisticsSpec(src, "stdMean", plan, "f32", name), src, [view("f32", 0), view("f32", 4 * K)], op);
            const prepared = gpu.temp("f32", [2, K], op);
            gpu.zscore(commands, encoder, { storage, count: K, dtype: src.dtype, std: 0, mean: 4 * K, min: base, max: base + region }, prepared, epsilon, op);
            const [center, denom] = [0, 4 * K].map((offset) => GPUndarray.wrap(prepared.buffer, "f32", { shape }, offset));
            gpu.affine(commands, encoder, { dst: out, src, srcStrides: src.stridesBytes, form: 1, params: [broadcast(center!), broadcast(denom!)] }, op);
            return;
        }
        let bounds = [min, max];
        if (size === 4 && src.dtype !== "f32") {
            const cast = gpu.temp("f32", [2 * K], op);
            gpu.copy(GPUndarray.wrap(storage, src.dtype, { shape: [2 * K] }), cast, commands, encoder, op);
            bounds = [0, 4 * K].map((offset) => GPUndarray.wrap(cast.buffer, "f32", { shape }, offset));
        }
        const [r0, r1] = plan.range.map(Math.fround) as [number, number];
        const unit = r0 === 0 && r1 === 1;
        gpu.affine(commands, encoder, { dst: out, src, srcStrides: src.stridesBytes, form: unit ? 2 : 3, params: [broadcast(bounds[0]!), broadcast(bounds[1]!)], epsilon, range: [r0, Math.fround(r1 - r0)] }, op);
    }

    resize<T extends AnyNdarray>(a: T, options: NdarrayResizeOptions): T {
        return this.resizeImpl(a, options, "resize");
    }

    resample<T extends AnyNdarray>(a: T, options: NdarrayResampleOptions): T {
        return this.resizeImpl(a, options, "resample");
    }

    private resizeImpl<T extends AnyNdarray>(a: T, options: NdarrayResizeOptions | NdarrayResampleOptions, op: "resize" | "resample"): T {
        this.assertAlive(op);
        assertNdarray(a, op);
        const resample = op === "resample", verb = resample ? "resampl" : "resiz";
        assert(typeof options === "object" && options !== null, `${opName(op)}: options with ${resample ? "axes, size, and scale" : "axes and size"} are required`);
        assert(typeof options.axes === "number" || (Array.isArray(options.axes) && options.axes.length > 0), `${opName(op)}: axes must be a non-empty list of distinct axes`);
        const axes = normalizeAxes(options.axes, a.ndim, opName(op));
        const count = axes.length;
        const perAxis = <V>(value: V | ReadonlyArray<V>, label: string): V[] => {
            if (!Array.isArray(value)) return new Array<V>(count).fill(value as V);
            assert(value.length === count, `${opName(op)}: ${label} must be a single value or have one entry per axis (${count} axes, got ${value.length} entries)`);
            return value.slice();
        };
        const sizes = perAxis(options.size, "size");
        for (const n of sizes) assert(Number.isInteger(n) && n >= 0 && n <= 0xFFFFFFFF, `${opName(op)}: size entries must be integers >= 0 that fit in u32 (got ${n})`);
        const method = options.method ?? "linear";
        assert(method === "nearest" || method === "linear" || method === "cubic", `${opName(op)}: method must be "nearest", "linear", or "cubic" (got ${String(method)})`);
        const weighted = method !== "nearest";
        const alignCorners = (options as NdarrayResizeOptions).alignCorners ?? false;
        if (resample) assert((options as NdarrayResizeOptions).alignCorners === undefined, `${opName(op)}: alignCorners is not a resample option; express the alignment through scale and offset (corner alignment is scale (nIn - 1) / (nOut - 1) with offset 0)`);
        assert(typeof alignCorners === "boolean", `${opName(op)}: alignCorners must be a boolean`);
        assert(!(alignCorners && !weighted), `${opName(op)}: alignCorners applies only to methods "linear" and "cubic"`);
        const antialias = options.antialias ?? false;
        assert(typeof antialias === "boolean", `${opName(op)}: antialias must be a boolean`);
        assert(!(antialias && !weighted), `${opName(op)}: antialias applies only to methods "linear" and "cubic"`);
        assert(!(antialias && alignCorners), `${opName(op)}: antialias cannot be combined with alignCorners`);
        assert(options.cubicCoefficient === undefined || method === "cubic", `${opName(op)}: cubicCoefficient applies only to method "cubic"`);
        const cubicCoefficient = options.cubicCoefficient ?? -0.75;
        assert(typeof cubicCoefficient === "number" && Number.isFinite(cubicCoefficient), `${opName(op)}: cubicCoefficient must be a finite number (got ${String(cubicCoefficient)})`);
        if (resample) assert((options as NdarrayResampleOptions).scale !== undefined, `${opName(op)}: scale is required`);
        const scales = resample ? perAxis((options as NdarrayResampleOptions).scale, "scale") : [];
        const offsets = resample ? perAxis((options as NdarrayResampleOptions).offset ?? 0, "offset") : [];
        for (const [label, values] of [["scale", scales], ["offset", offsets]] as const) for (const v of values) assert(typeof v === "number" && Number.isFinite(v), `${opName(op)}: ${label} values must be finite numbers (got ${String(v)})`);
        const boundaries = perAxis<NdarrayResizeBoundary>(options.boundary ?? "edge", "boundary");
        for (const boundary of boundaries) assert(RESIZE_BOUNDARIES.includes(boundary), `${opName(op)}: boundary must be "edge", "constant", "reflect", "symmetric", "wrap", or "renormalize" (got ${String(boundary)})`);
        if (resample) assert(boundaries.some((b) => b === "constant" || b === "renormalize") || options.value === undefined, `${opName(op)}: value applies only to boundaries "constant" and "renormalize"`);
        else assert(boundaries.includes("constant") || options.value === undefined, `${opName(op)}: value applies only to boundary "constant"`);
        const complex = isComplexDType(a.dtype);
        const dtype = options.dtype ?? a.dtype;
        const raw = options.value ?? 0;
        if (resample && !weighted) { dtypeInfo(dtype); validateElementValue(dtype, raw, op); }
        else if (complex) validateElementValue(a.dtype, raw, op);
        else {
            assert(!Array.isArray(raw), `${opName(op)}: a [re, im] value requires a complex input (got ${a.dtype})`);
            assert(typeof raw === "number", `${opName(op)}: value must be a number`);
        }
        const value: ComplexScalar = (typeof raw === "number") ? [raw, 0] : [raw[0], raw[1]];
        const order = axes.map((_, k) => k).sort((i, j) => axes[i]! - axes[j]!);
        const shape = a.shape.slice();
        const resized: ResizeAxis[] = order.map((k) => {
            const axis = axes[k]!, nIn = a.shape[axis]!, nOut = sizes[k]!;
            assert(nIn > 0 || nOut === 0, `${opName(op)}: cannot ${verb}e empty axis ${axis} to ${nOut}`);
            assert(nIn <= 0x7FFFFFFF, `${opName(op)}: ${verb}ed axes support at most 2^31 - 1 input elements (axis ${axis} has ${nIn})`);
            shape[axis] = nOut;
            if (!resample) return { axis, nIn, nOut, boundary: boundaries[k]!, grid: { alignCorners } };
            const scale = scales[k]!, offset = offsets[k]!;
            const reach = ((method === "nearest") ? 0.5 : (method === "cubic") ? 2 : 1) * (antialias ? Math.max(1, Math.abs(scale)) : 1);
            if (nOut > 0) for (const x of [offset, (nOut - 1) * scale + offset]) assert(Math.abs(x) + reach < 0x7FFFFFFF, `${opName(op)}: axis ${axis} samples the source coordinate ${x}, and |x| + ${reach} (the filter reach) must stay below 2^31 - 1`);
            return { axis, nIn, nOut, boundary: boundaries[k]!, grid: { scale, offset } };
        });
        assert(numelFromShape(shape) <= 0xFFFFFFFF, `${opName(op)}: the number of output elements must fit in u32`);
        dtypeInfo(dtype);
        assert(!complex || isComplexDType(dtype), `${opName(op)}: ${verb}ing ${a.dtype} into ${dtype} would discard imaginary parts; ${verb}e compute.ndarray.real() or compute.ndarray.imag() views instead`);
        const gpu = a instanceof GPUndarray;
        if (a instanceof CPUndarray) { assertCPUOptions(options, op); a[ndarrayAssertAlive](); }
        else if (weighted) assert(a.dtype !== "f64" && a.dtype !== "c128" && dtype !== "f64" && dtype !== "c128", `${opName(op)}: GPU linear and cubic ${verb}ing computes in f32 and does not support f64 or c128 inputs or outputs; use method "nearest" or a CPU array`);
        else assertCast(a.dtype, dtype, "gpu", op);
        const empty = numelFromShape(shape) === 0;
        const limit = this.device.limits.maxStorageBufferBindingSize;
        const sampling: ResizeSampling = { method, antialias, cubicCoefficient };
        const levels: ResizeLevel[] = [];
        if (!empty) {
            for (const axis of resized) {
                if (isIdentityAxis(axis)) continue;
                if (gpu) assertResizeParams(3 * axis.nOut + 1, limit, op);
                const table = buildResizeTable(axis, sampling, gpu, op);
                if (!isIdentityTable(table, axis.nIn)) levels.push({ ...axis, table });
            }
            if (levels.length === 0) levels.push({ ...resized[count - 1]!, table: buildResizeTable(resized[count - 1]!, sampling, gpu, op) });
        }
        const midDType: DType = !weighted ? dtype : gpu ? (complex ? "c64" : "f32") : (complex ? "c128" : "f64");
        const midBytes = dtypeInfo(midDType).bytesPerElement;
        const constant = elementBits(dtype, weighted ? 0 : value);
        if (a instanceof CPUndarray) {
            const plan = empty ? { passes: [] } : planResize(levels, a.shape, RESIZE_WRITE_COST.cpu, midBytes, (mid) => numelFromShape(mid) * midBytes <= 0xFFFFFFFF, this.maxCPUIntermediateBytes);
            if ("blocked" in plan) throw new Error(`${opName(op)}: a ${numelFromShape(plan.blocked) * midBytes}-byte ${midDType} resize intermediate of shape [${plan.blocked}] exceeds the wasm32 address space, and its passes cannot be merged`);
            const passes = plan.passes;
            const shapes = resizeShapes(a.shape, passes);
            let out: CPUndarray | null = null, mid: CPUndarray | null = null;
            try {
                let input: CPUndarray = a;
                for (let p = 0; p < passes.length; p++) {
                    const last = p === passes.length - 1;
                    const target = CPUndarray.empty(last ? dtype : midDType, { shape: last ? shape : shapes[p]! });
                    if (last) out = target;
                    try { cpuResize(target, input, passes[p]!, weighted, value, constant, op); }
                    catch (error) { if (!last) target.destroy(); throw error; }
                    mid?.destroy();
                    mid = last ? null : target;
                    input = target;
                }
                return (out ?? CPUndarray.empty(dtype, { shape })) as T;
            } catch (error) { mid?.destroy(); out?.destroy(); throw error; }
        }
        const bindable = Math.min(this.device.limits.maxBufferSize, limit);
        const fits = (mid: ReadonlyArray<number>): boolean => { const n = numelFromShape(mid); return n <= 0xFFFFFFFF && alignTo(n * midBytes, 4) <= bindable; };
        const plan = empty ? { passes: [] } : planResize(levels, a.shape, RESIZE_WRITE_COST.gpu, midBytes, fits);
        if ("blocked" in plan) {
            const widest = plan.blocked;
            throw new Error(`${opName(op)}: a ${numelFromShape(widest) * midBytes}-byte ${midDType} resize intermediate of shape [${widest}] exceeds device.limits.maxStorageBufferBindingSize (${limit}) or device.limits.maxBufferSize (${this.device.limits.maxBufferSize}), and its passes cannot be merged; request larger maxStorageBufferBindingSize and maxBufferSize limits through the renderer's device descriptor`);
        }
        const passes = plan.passes;
        for (const pass of passes) assertResizeParams(pass.reduce((words, level) => words + level.table.words!.length, 0), limit, op);
        const shapes = resizeShapes(a.shape, passes);
        const slots = [0, 0];
        for (let p = 0; p < passes.length - 1; p++) slots[p % 2] = Math.max(slots[p % 2]!, numelFromShape(shapes[p]!) * midBytes);
        const valueBits = !weighted ? constant : complex ? elementBits("c64", value) : elementBits("f32", value[0]);
        return this.gpuRun(a as GPUndarray, dtype, shape, options, op, (commands, out, src) => {
            const temps = slots.map((bytes) => (bytes > 0) ? this.gpu.tempStorage(bytes, op) : null);
            let input = src;
            for (let p = 0; p < passes.length; p++) {
                const pass = passes[p]!, last = p === passes.length - 1;
                const dst = last ? out : GPUndarray.wrap(temps[p % 2]!, midDType, { shape: shapes[p]! });
                const constants = { SRC_DTYPE: DTYPE_CODE[input.dtype], DST_DTYPE: DTYPE_CODE[dst.dtype], OPERATION: 3, RESIZE_METHOD: weighted ? 1 : 0, RESIZE_LEVELS: pass.length, OVERFLOW: 1, ROUNDING: 1 };
                const keep = dst.shape.map((_, i) => pass.some((level) => level.axis === i));
                this.gpu.gather(commands, options.encoder, { dst, src: input, entryPoint: "resize", constants, srcStrides: input.stridesBytes, keep, valueBits, resizeLevels: { axes: pass.map((level) => level.axis), tables: pass.map((level) => level.table.words!) } }, op);
                input = dst;
            }
        }) as T;
    }

    sum<T extends AnyNdarray>(a: T, options: NdarrayReduceOptions = {}): T {
        return this.reduceImpl(a, "sum", options)[0] as T;
    }

    prod<T extends AnyNdarray>(a: T, options: NdarrayReduceOptions = {}): T {
        return this.reduceImpl(a, "prod", options)[0] as T;
    }

    mean<T extends AnyNdarray>(a: T, options: NdarrayReduceOptions = {}): T {
        return this.reduceImpl(a, "mean", options)[0] as T;
    }

    var<T extends AnyNdarray>(a: T, options: NdarrayVarianceOptions = {}): T {
        return this.reduceImpl(a, "var", options)[0] as T;
    }

    std<T extends AnyNdarray>(a: T, options: NdarrayVarianceOptions = {}): T {
        return this.reduceImpl(a, "std", options)[0] as T;
    }

    min<T extends AnyNdarray>(a: T, options: NdarrayReduceOptions = {}): T {
        return this.reduceImpl(a, "min", options)[0] as T;
    }

    max<T extends AnyNdarray>(a: T, options: NdarrayReduceOptions = {}): T {
        return this.reduceImpl(a, "max", options)[0] as T;
    }

    argmin<T extends AnyNdarray>(a: T, options: NdarrayArgReduceOptions = {}): T {
        return this.reduceImpl(a, "argmin", options)[0] as T;
    }

    argmax<T extends AnyNdarray>(a: T, options: NdarrayArgReduceOptions = {}): T {
        return this.reduceImpl(a, "argmax", options)[0] as T;
    }

    minMax<T extends AnyNdarray>(a: T, options: NdarrayMinMaxOptions = {}): NdarrayMinMaxResult<T> {
        const [min, max] = this.reduceImpl(a, "minMax", options);
        return { min: min as T, max: max as T };
    }

    varMean<T extends AnyNdarray>(a: T, options: NdarrayVarMeanOptions = {}): NdarrayVarMeanResult<T> {
        const [variance, mean] = this.reduceImpl(a, "varMean", options);
        return { var: variance as T, mean: mean as T };
    }

    stdMean<T extends AnyNdarray>(a: T, options: NdarrayStdMeanOptions = {}): NdarrayStdMeanResult<T> {
        const [std, mean] = this.reduceImpl(a, "stdMean", options);
        return { std: std as T, mean: mean as T };
    }

    private reduceImpl(a: AnyNdarray, op: ReduceOp, options: ReduceOptions): AnyNdarray[] {
        this.assertAlive(op);
        assertNdarray(a, op);
        const spec = resolveReduce(a, op, options);
        if (a instanceof CPUndarray) {
            assertCPUOptions(options, op);
            a[ndarrayAssertAlive]();
            return cpuReduce(a, spec);
        }
        return this.gpuReduce(a as GPUndarray, spec, options);
    }

    private gpuReduce(a: GPUndarray, spec: ReduceSpec, options: ReduceOptions): GPUndarray[] {
        const op = spec.op, name = opName(op);
        this.assertGPUArray(a, op);
        assertReduceGPU(spec);
        const names = REDUCE_OUTPUT_NAMES[op];
        if (names) {
            assert(options.out === undefined || (typeof options.out === "object" && options.out !== null && !(options.out instanceof GPUndarray) && !Array.isArray(options.out)), `${name}: out must be an object with optional ${names[0]} and ${names[1]} arrays`);
            for (const key in (options.out ?? {})) assert(key === names[0] || key === names[1], `${name}: out has no ${key} output; use ${names[0]} and ${names[1]}`);
        }
        const requested = (i: number): GPUndarray | undefined => (names ? (options.out as Record<string, GPUndarray | undefined> | undefined)?.[names[i]!] : options.out as GPUndarray | undefined);
        const made: GPUndarray[] = [], outs: GPUndarray[] = [];
        const commands: ComputeDispatchCommand[] = [];
        try {
            spec.dtypes.forEach((dtype, i) => {
                const { out, owned } = this.gpuOutput(dtype, spec.shape, { ...options, out: requested(i) } as NdarrayOperationOptions, op);
                outs.push(out);
                if (owned) made.push(out);
            });
            if (outs.length === 2) assert(!gpuRangesOverlap(outs[0]!, outs[1]!), `${name}: the ${names![0]} and ${names![1]} outputs must not overlap`);
            const shared = outs.some((out) => out.buffer.buffer === a.buffer.buffer && out.numel > 0);
            const input = (shared && !spec.empty) ? this.gpu.stage(a, commands, options.encoder, op) : a;
            this.gpu.reduce(commands, options.encoder, spec, input, outs, op);
            this.gpu.submit(commands, options.encoder, options.label, op);
            return outs;
        } catch (error) { for (const out of made) out.destroy(); throw error; } finally { this.scratch.reset(options.encoder); }
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
        const count = assertSourceLength(dtype, numelFromShape(dims), src.length);
        const data = new info.ctor(new ArrayBuffer(byteLength));
        for (let i = 0; i < count; i++) data[i] = src[i] as number;
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

    real<T extends AnyNdarray>(a: T): T {
        const info = this.complexInput(a, "real");
        return a[ndarrayView](a.shape.slice(), a.stridesBytes.slice(), a.offsetBytes, info.componentDType) as T;
    }

    imag<T extends AnyNdarray>(a: T): T {
        const info = this.complexInput(a, "imag");
        return a[ndarrayView](a.shape.slice(), a.stridesBytes.slice(), a.offsetBytes + info.ctor.BYTES_PER_ELEMENT, info.componentDType) as T;
    }

    viewAsReal<T extends AnyNdarray>(a: T): T {
        const info = this.complexInput(a, "viewAsReal");
        return a[ndarrayView]([...a.shape, 2], [...a.stridesBytes, info.ctor.BYTES_PER_ELEMENT], a.offsetBytes, info.componentDType) as T;
    }

    viewAsComplex<T extends AnyNdarray>(a: T): T {
        const op = "viewAsComplex";
        this.assertAlive(op);
        assertNdarray(a, op);
        assert(a.dtype === "f32" || a.dtype === "f64", `${opName(op)}: expected an f32 or f64 array (got ${a.dtype})`);
        const dtype: ComplexDType = (a.dtype === "f32") ? "c64" : "c128";
        const size = dtypeInfo(dtype).bytesPerElement;
        const hint = "; call compute.ndarray.contiguous() first";
        assert(a.ndim >= 1 && a.shape[a.ndim - 1] === 2, `${opName(op)}: the last axis must have length 2 (got shape [${a.shape}])`);
        assert(a.stridesBytes[a.ndim - 1] === a.bytesPerElement, `${opName(op)}: the last axis must have a stride of ${a.bytesPerElement} bytes (got ${a.stridesBytes[a.ndim - 1]})${hint}`);
        const shape = a.shape.slice(0, -1);
        const strides = a.stridesBytes.slice(0, -1);
        for (let i = shape.length - 1; i >= 0; i--) {
            if (shape[i]! > 1) {
                assert(strides[i]! % size === 0, `${opName(op)}: the stride of axis ${i} (${strides[i]} bytes) must be a multiple of the ${dtype} element size (${size} bytes)${hint}`);
                continue;
            }
            if (strides[i]! % size === 0) continue;
            const stride = (i === shape.length - 1) ? size : strides[i + 1]! * Math.max(shape[i + 1]!, 1);
            strides[i] = (stride >= -0x80000000 && stride <= 0x7FFFFFFF && stride !== 0) ? stride : size;
        }
        if (numelFromShape(shape) > 0) {
            const address = (a instanceof CPUndarray) ? a.basePtrBytes + a.offsetBytes : (a as GPUndarray).buffer.offsetBytes + (a as GPUndarray).baseOffsetBytes + a.offsetBytes;
            assert(address % size === 0, `${opName(op)}: the first element must be aligned to the ${dtype} element size (${size} bytes)${hint}`);
        }
        return a[ndarrayView](shape, validateStridesBytes(strides, shape.length, size, `${opName(op)}: `), a.offsetBytes, dtype) as T;
    }

    private complexInput(a: AnyNdarray, op: string): DTypeInfo {
        this.assertAlive(op);
        assertNdarray(a, op);
        assert(isComplexDType(a.dtype), `${opName(op)}: expected a c64 or c128 array (got ${a.dtype})`);
        return dtypeInfo(a.dtype);
    }
}
