/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert } from "../utils";
import { dtypeInfo, type DType, type NumberTypedArray } from "../compute/ndarray";
import { driver, frameArena, type WasmPtr, wasm, WasmHeapArena } from "../wasm";

export type PyProxyLike = {
    getBuffer: (type?: string) => PyBufferLike;
};

export type PyBufferLike = {
    data: ArrayBufferView;
    shape: number[];
    strides: number[];
    offset: number;
    c_contiguous?: boolean;
    f_contiguous?: boolean;
    format?: string;
    itemsize?: number;
    ndim?: number;
    nbytes?: number;
    readonly?: boolean;
    release?: () => void;
};

export type PythonArraySource = ArrayBufferView | PyBufferLike | PyProxyLike;

export type WasmNdarrayHandle = {
    kind: "heap" | "frame" | "arena";
    dtype: DType;
    shape: number[];
    ptr: WasmPtr;
    length: number;
    byteLength: number;
    epoch?: number;
};

export type SendNdarrayOptions = {
    dtype?: DType;
    shape?: ReadonlyArray<number>;
    allocator?: "heap" | "frame" | WasmHeapArena;
};

export type ReceiveNdarrayOptions = {
    copy?: boolean;
};

export type NdarrayTransfer = {
    dtype: DType;
    shape: number[];
    data: NumberTypedArray;
};

const isPyProxyLike = (x: unknown): x is PyProxyLike => {
    return (typeof x === "object") && (x !== null) && (typeof (x as any).getBuffer === "function");
};

const isPyBufferLike = (x: unknown): x is PyBufferLike => {
    return (typeof x === "object") && (x !== null) && (typeof (x as any).data === "object") && Array.isArray((x as any).shape);
};

const normalizeShape = (shape: ReadonlyArray<number>): number[] => {
    const out: number[] = new Array(shape.length);
    for (let i = 0; i < shape.length; i++) {
        const dim = shape[i];
        assert(Number.isFinite(dim), `shape[${i}] must be finite`);
        assert(Number.isInteger(dim), `shape[${i}] must be an integer`);
        assert(dim >= 0, `shape[${i}] must be >= 0`);
        out[i] = dim >>> 0;
    }
    return out;
};

const numelOfShape = (shape: ReadonlyArray<number>): number => {
    if (shape.length === 0) return 1;
    let n = 1;
    for (const d of shape) {
        const dim = d >>> 0;
        const next = n * dim;
        assert(Number.isSafeInteger(next), "shape is too large (numel overflow)");
        n = next;
    }
    return n >>> 0;
};

const dtypeOfTypedArray = (view: ArrayBufferView): DType | null => {
    if (view instanceof Float32Array) return "f32";
    if (view instanceof Float64Array) return "f64";
    if (view instanceof Int8Array) return "i8";
    if (view instanceof Uint8Array) return "u8";
    if (view instanceof Uint8ClampedArray) return "u8";
    if (view instanceof Int16Array) return "i16";
    if (view instanceof Uint16Array) return "u16";
    if (view instanceof Int32Array) return "i32";
    if (view instanceof Uint32Array) return "u32";
    return null;
};

const viewAsDType = (dtype: DType, view: ArrayBufferView, offsetElements: number = 0, lengthElements?: number): NumberTypedArray => {
    const info = dtypeInfo(dtype);
    const ctor = info.ctor as unknown as (new (buffer: ArrayBuffer, byteOffset: number, length: number) => NumberTypedArray);
    const bpe = info.bytesPerElement >>> 0;
    const offEl = offsetElements >>> 0;
    const lenEl = (lengthElements === undefined) ? (((view.byteLength >>> 0) / bpe) >>> 0) : (lengthElements >>> 0);
    const byteOffset = ((view.byteOffset >>> 0) + (offEl * bpe)) >>> 0;
    return new ctor(view.buffer as unknown as ArrayBuffer, byteOffset >>> 0, lenEl >>> 0);
};

const allocBytes = (byteLength: number, align: number, allocator: SendNdarrayOptions["allocator"]): { kind: WasmNdarrayHandle["kind"]; ptr: WasmPtr; epoch?: number } => {
    const bytes = byteLength >>> 0;
    const a0 = align >>> 0;
    const a = (a0 === 0) ? 16 : a0;
    if ((a & (a - 1)) !== 0) throw new Error(`allocBytes(${byteLength}, ${align}): align must be a power of two`);
    if (allocator === "frame") {
        const ptr = frameArena.alloc(bytes, a) >>> 0;
        return { kind: "frame", ptr };
    }
    if (allocator && typeof allocator === "object") {
        const arena = allocator as WasmHeapArena;
        const epoch = arena.epoch() >>> 0;
        const ptr = arena.alloc(bytes, a) >>> 0;
        return { kind: "arena", ptr, epoch };
    }
    const ptr = wasm.allocBytes(bytes) >>> 0;
    if (!ptr && bytes !== 0) throw new Error(`wasm.allocBytes(${bytes}) failed`);
    const heapAlign = Math.min(a, 8) >>> 0;
    if (heapAlign !== 0 && (ptr & (heapAlign - 1)) !== 0) throw new Error(`wasm.allocBytes(${bytes}) returned ptr 0x${ptr.toString(16)} which is not ${heapAlign}-byte aligned`);
    return { kind: "heap", ptr };
};

const typedViewFromPtr = (dtype: DType, ptr: WasmPtr, length: number): NumberTypedArray => {
    const info = dtypeInfo(dtype);
    const ctor = info.ctor as unknown as (new (buffer: ArrayBuffer, byteOffset: number, length: number) => NumberTypedArray);
    const buf = driver.buffer() as unknown as ArrayBuffer;
    return new ctor(buf, ptr >>> 0, length >>> 0);
};

const bytesViewFromPtr = (ptr: WasmPtr, byteLength: number): Uint8Array => {
    const base = driver.bytes();
    const start = ptr >>> 0;
    const end = (start + (byteLength >>> 0)) >>> 0;
    return base.subarray(start, end);
};

const assertIsCContiguous = (buf: PyBufferLike): void => {
    if (typeof buf.c_contiguous === "boolean") {
        assert(buf.c_contiguous, "Python buffer must be C-contiguous (use numpy.ascontiguousarray(..., order=\"C\"))");
        return;
    }
    const shape = normalizeShape(buf.shape ?? []);
    const strides = Array.from(buf.strides ?? []);
    assert(strides.length === shape.length, "Python buffer strides/shape rank mismatch");
    if (numelOfShape(shape) === 0) return;
    let expected = 1;
    for (let i = shape.length - 1; i >= 0; i--) {
        assert(strides[i] === expected, "Python buffer must be C-contiguous (use numpy.ascontiguousarray(..., order=\"C\"))");
        expected *= shape[i];
    }
};

const resolveSource = (src: PythonArraySource, options: SendNdarrayOptions): { dtype: DType; shape: number[]; data: NumberTypedArray; release?: () => void } => {
    if (isPyProxyLike(src)) {
        const pybuf = src.getBuffer();
        const resolved = resolveSource(pybuf, options);
        const release = (typeof pybuf.release === "function") ? () => pybuf.release?.() : undefined;
        return { ...resolved, release };
    }
    if (isPyBufferLike(src)) {
        assertIsCContiguous(src);
        assert(ArrayBuffer.isView(src.data), "Python buffer .data must be an ArrayBufferView");
        assert(typeof (src.data as any).subarray === "function", "Python buffer .data must be a TypedArray (DataView is not supported)");
        const inferred = dtypeOfTypedArray(src.data);
        assert(inferred !== null, "Unsupported Python buffer dtype (expected a numeric TypedArray)");
        const dtype = options.dtype ?? inferred;
        assert(dtype === inferred, `dtype mismatch: expected ${dtype}, got ${inferred}`);
        const srcShape = normalizeShape(src.shape);
        const shape = normalizeShape(options.shape ?? srcShape);
        const numel = numelOfShape(shape);
        const offset = (src.offset ?? 0) >>> 0;
        const data = viewAsDType(dtype, src.data, offset, numel);
        assert((data.length >>> 0) === (numel >>> 0), "Python buffer view length mismatch");
        if (options.shape) assert(normalizeShape(options.shape).length === srcShape.length && normalizeShape(options.shape).every((d, i) => d === srcShape[i]), "shape mismatch");
        return { dtype, shape, data, release: (typeof src.release === "function") ? () => src.release?.() : undefined };
    }
    assert(ArrayBuffer.isView(src), "Expected a TypedArray / ArrayBufferView or a PyProxy supporting getBuffer()");
    const inferred = dtypeOfTypedArray(src);
    assert(inferred !== null, "Unsupported TypedArray dtype");
    const dtype = options.dtype ?? inferred;
    assert(dtype === inferred, `dtype mismatch: expected ${dtype}, got ${inferred}`);
    assert(options.shape, "shape is required when sending a plain TypedArray (no Python buffer metadata available)");
    const shape = normalizeShape(options.shape);
    const numel = numelOfShape(shape);
    assert((src.byteLength >>> 0) >= (numel * dtypeInfo(dtype).bytesPerElement), "source TypedArray is too small for the provided shape");
    const data = viewAsDType(dtype, src, 0, numel);
    assert((data.length >>> 0) === (numel >>> 0), "source TypedArray length mismatch");
    return { dtype, shape, data };
};

export const pythonInterop = {
    sendNdarray: (src: PythonArraySource, options: SendNdarrayOptions = {}): WasmNdarrayHandle => {
        const resolved = resolveSource(src, options);
        const { dtype, shape, data } = resolved;
        const info = dtypeInfo(dtype);
        const numel = numelOfShape(shape);
        const byteLength = (numel * info.bytesPerElement) >>> 0;
        const alloc = allocBytes(byteLength, 16, options.allocator);
        const dst = typedViewFromPtr(dtype, alloc.ptr, numel);
        dst.set(data);
        try { resolved.release?.(); } catch { /* ignore */ }
        const handle: WasmNdarrayHandle = {
            kind: alloc.kind,
            dtype,
            shape,
            ptr: alloc.ptr >>> 0,
            length: numel >>> 0,
            byteLength: byteLength >>> 0
        };
        if (alloc.epoch !== undefined) handle.epoch = alloc.epoch >>> 0;
        return handle;
    },

    view: (handle: WasmNdarrayHandle): NumberTypedArray => {
        return typedViewFromPtr(handle.dtype, handle.ptr, handle.length);
    },

    bytes: (handle: WasmNdarrayHandle): Uint8Array => {
        return bytesViewFromPtr(handle.ptr, handle.byteLength);
    },

    copyInto: (handle: WasmNdarrayHandle, src: PythonArraySource, options: Omit<SendNdarrayOptions, "allocator" | "shape"> = {}): void => {
        const resolved = resolveSource(src, { ...options, dtype: handle.dtype, shape: handle.shape });
        const { data } = resolved;
        assert((data.length >>> 0) === (handle.length >>> 0), "copyInto: source length mismatch");
        const dst = typedViewFromPtr(handle.dtype, handle.ptr, handle.length);
        dst.set(data);
        try { resolved.release?.(); } catch { /* ignore */ }
    },

    receiveNdarray: (handle: WasmNdarrayHandle, options: ReceiveNdarrayOptions = {}): NdarrayTransfer => {
        const view = typedViewFromPtr(handle.dtype, handle.ptr, handle.length);
        if (!options.copy) return { dtype: handle.dtype, shape: Array.from(handle.shape), data: view };
        const info = dtypeInfo(handle.dtype);
        const ctor = info.ctor as unknown as (new (length: number) => NumberTypedArray);
        const out = new ctor(handle.length >>> 0);
        out.set(view);
        return { dtype: handle.dtype, shape: Array.from(handle.shape), data: out };
    },

    free: (handle: WasmNdarrayHandle): void => {
        if (handle.kind !== "heap") throw new Error(`pythonInterop.free(): cannot free a ${handle.kind} allocation. Use reset() for arena-like allocators (frameArena.reset() / WasmHeapArena.reset()).`);
        wasm.freeBytes(handle.ptr >>> 0, handle.byteLength >>> 0);
    }
};
