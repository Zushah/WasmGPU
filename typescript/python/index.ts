/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { assert } from "../utils";
import { CPUndarray, GPUndarray, StorageBuffer, dtypeInfo, type Compute, type DType, type NumberTypedArray } from "../compute";

export type PyProxyLike = { getBuffer: (type?: string) => PyBufferLike };

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

export type PythonArraySource = PyProxyLike | PyBufferLike;

export type PythonGPUTransferOptions = {
    label?: string;
    copyDst?: boolean;
    copySrc?: boolean;
    usage?: GPUBufferUsageFlags;
};

type ResolvedSource = { dtype: DType; shape: number[]; data: NumberTypedArray; byteLength: number };

const isPyProxyLike = (x: unknown): x is PyProxyLike => typeof x === "object" && x !== null && typeof (x as PyProxyLike).getBuffer === "function";

const isPyBufferLike = (x: unknown): x is PyBufferLike => {
    const value = x as Partial<PyBufferLike> | null;
    return typeof value === "object" && value !== null && ArrayBuffer.isView(value.data) && Array.isArray(value.shape) && Array.isArray(value.strides);
};

const dtypeOfTypedArray = (view: ArrayBufferView): DType | null => {
    if (view instanceof Int8Array) return "i8";
    if (view instanceof Uint8Array && !(view instanceof Uint8ClampedArray)) return "u8";
    if (view instanceof Int16Array) return "i16";
    if (view instanceof Uint16Array) return "u16";
    if (view instanceof Int32Array) return "i32";
    if (view instanceof Uint32Array) return "u32";
    if (view instanceof Float32Array) return "f32";
    if (view instanceof Float64Array) return "f64";
    return null;
};

const validateShape = (value: unknown): number[] => {
    assert(Array.isArray(value), "Python buffer shape must be an array");
    const shape = new Array<number>(value.length);
    for (let i = 0; i < value.length; i++) {
        const dim = value[i];
        assert(Number.isSafeInteger(dim) && dim >= 0, `Python buffer shape[${i}] must be a non-negative safe integer`);
        assert(dim <= 0xFFFFFFFF, `Python buffer shape[${i}] must fit in u32`);
        shape[i] = dim;
    }
    return shape;
};

const numelOf = (shape: ReadonlyArray<number>): number => {
    let numel = 1;
    for (const dim of shape) {
        numel *= dim;
        assert(Number.isSafeInteger(numel), "Python buffer shape product exceeds JavaScript's safe integer range");
        if (dim === 0) return 0;
    }
    return numel;
};

const contiguousStridesBytes = (shape: ReadonlyArray<number>, bytesPerElement: number): number[] => {
    const strides = new Array<number>(shape.length);
    let stride = bytesPerElement;
    for (let i = shape.length - 1; i >= 0; i--) {
        assert(Number.isSafeInteger(stride) && stride <= 0x7FFFFFFF, "Python buffer contiguous stride exceeds the supported i32 range");
        strides[i] = stride;
        stride *= shape[i];
    }
    return strides;
};

const resolveBuffer = (buffer: PyBufferLike): ResolvedSource => {
    assert(!(buffer.data instanceof DataView), "Python buffer DataView sources are not supported");
    const dtype = dtypeOfTypedArray(buffer.data);
    assert(dtype !== null, "Unsupported Python buffer dtype, expected i8, u8, i16, u16, i32, u32, f32, or f64");
    if (buffer.format !== undefined) assert(buffer.format.slice(-1) !== "?", "Unsupported Python buffer dtype bool, cast to uint8 before importing");
    const info = dtypeInfo(dtype);
    const shape = validateShape(buffer.shape);
    assert(buffer.strides.length === shape.length, "Python buffer strides/shape rank mismatch");
    if (buffer.ndim !== undefined) assert(Number.isSafeInteger(buffer.ndim) && buffer.ndim === shape.length, "Python buffer ndim does not match shape rank");
    if (buffer.itemsize !== undefined) assert(Number.isSafeInteger(buffer.itemsize) && buffer.itemsize === info.bytesPerElement, "Python buffer itemsize does not match its typed data");
    assert(buffer.c_contiguous !== false, "Python buffer must be C-contiguous");
    const numel = numelOf(shape);
    const byteLength = numel * info.bytesPerElement;
    assert(Number.isSafeInteger(byteLength), "Python buffer byte length exceeds JavaScript's safe integer range");
    if (buffer.nbytes !== undefined) assert(Number.isSafeInteger(buffer.nbytes) && buffer.nbytes === byteLength, "Python buffer nbytes does not match shape and dtype");
    let expectedStride = 1;
    for (let i = shape.length - 1; i >= 0; i--) {
        const stride = buffer.strides[i];
        assert(Number.isSafeInteger(stride), `Python buffer strides[${i}] must be a safe integer`);
        if (numel !== 0 && shape[i] > 1) assert(stride === expectedStride, "Python buffer must be C-contiguous");
        expectedStride *= shape[i];
        assert(Number.isSafeInteger(expectedStride), "Python buffer stride calculation overflowed");
    }
    const offset = buffer.offset ?? 0;
    assert(Number.isSafeInteger(offset) && offset >= 0, "Python buffer offset must be a non-negative safe integer");
    const byteOffset = buffer.data.byteOffset + offset * info.bytesPerElement;
    const byteEnd = byteOffset + byteLength;
    assert(Number.isSafeInteger(byteOffset) && Number.isSafeInteger(byteEnd), "Python buffer range arithmetic overflowed");
    assert(byteOffset >= buffer.data.byteOffset && byteEnd <= buffer.data.byteOffset + buffer.data.byteLength, "Python buffer offset/range is outside its typed data view");
    assert((byteOffset % info.bytesPerElement) === 0, "Python buffer offset is not aligned for its dtype");
    const ctor = dtypeInfo(dtype).ctor;
    const data = new ctor(buffer.data.buffer, byteOffset, numel) as NumberTypedArray;
    return { dtype, shape, data, byteLength };
};

const withResolvedSource = <T>(src: PythonArraySource, operation: (resolved: ResolvedSource) => T): T => {
    const acquired = isPyProxyLike(src);
    const buffer = acquired ? src.getBuffer() : src;
    let operationError: unknown;
    try {
        assert(isPyBufferLike(buffer), "Expected a Pyodide proxy with getBuffer() or a PyBufferLike object");
        return operation(resolveBuffer(buffer));
    } catch (error) {
        operationError = error;
        throw error;
    } finally {
        if (acquired && typeof (buffer as Partial<PyBufferLike> | null)?.release === "function") {
            try { (buffer as PyBufferLike).release!(); }
            catch (releaseError) { if (operationError === undefined) throw releaseError; }
        }
    }
};

const sameShape = (a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean => a.length === b.length && a.every((dim, i) => dim === b[i]);

const gpuWriteSource = (data: NumberTypedArray): BufferSource => {
    if ((data.byteOffset & 3) === 0) return data as unknown as BufferSource;
    const copy = new Uint8Array(data.byteLength);
    copy.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    return copy;
};

export class PythonInterop {
    private readonly compute: Compute;

    constructor(compute: Compute) {
        this.compute = compute;
    }

    toCPU(src: PythonArraySource): CPUndarray {
        return withResolvedSource(src, ({ dtype, shape, data }) => {
            const dst = CPUndarray.empty(dtype, { shape });
            try { dst.data().set(data); return dst; }
            catch (error) { dst.destroy(); throw error; }
        });
    }

    toGPU(src: PythonArraySource, options: PythonGPUTransferOptions = {}): GPUndarray {
        return withResolvedSource(src, ({ dtype, shape, data, byteLength }) => {
            let buffer: StorageBuffer | null = null;
            try {
                buffer = new StorageBuffer(this.compute.device, this.compute.queue, {
                    label: options.label,
                    data: data as unknown as BufferSource,
                    copyDst: options.copyDst ?? true,
                    copySrc: options.copySrc ?? true,
                    usage: options.usage
                });
                return new GPUndarray(dtype, shape, contiguousStridesBytes(shape, dtypeInfo(dtype).bytesPerElement), 0, byteLength, buffer, 0, true, this.compute.readback);
            } catch (error) { buffer?.destroy(); throw error; }
        });
    }

    copyInto(dst: CPUndarray | GPUndarray, src: PythonArraySource): void {
        withResolvedSource(src, ({ dtype, shape, data, byteLength }) => {
            assert(dst instanceof CPUndarray || dst instanceof GPUndarray, "PythonInterop.copyInto() destination must be a CPUndarray or GPUndarray");
            assert(dst.dtype === dtype, `PythonInterop.copyInto() dtype mismatch: destination is ${dst.dtype}, source is ${dtype}`);
            assert(sameShape(dst.shape, shape), `PythonInterop.copyInto() shape mismatch: destination is [${dst.shape}], source is [${shape}]`);
            assert(dst.isContiguousC, "PythonInterop.copyInto() destination must be C-contiguous");
            assert(dst.byteLength === byteLength, "PythonInterop.copyInto() byte length mismatch");
            if (dst instanceof CPUndarray) { dst.data().set(data); return; }
            assert((dst.buffer.usage & GPUBufferUsage.COPY_DST) !== 0, "PythonInterop.copyInto() GPU destination requires COPY_DST usage");
            dst.buffer.write(gpuWriteSource(data), dst.baseOffsetBytes, 0, byteLength);
        });
    }
}
