/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { alignTo, assert } from "../utils";
import { CPUndarray, GPUndarray, StorageBuffer, dtypeInfo, type Compute, type DType, type NumberTypedArray } from "../compute";
import { validateStorageBufferRange } from "../compute/buffer";
import { broadcastStrides, classifyLayout, defaultRowMajorStridesBytes, isContiguousColumnMajor, isContiguousRowMajor, mayAddressTwice, numelFromShape, orderedLayout, sameShape, sortedStridePermutation, validateShape } from "../compute/ndarray";

export type PyProxyLike = { getBuffer: (type?: string) => PyBufferLike };

export type PyBufferLike = {
    data: ArrayBufferView;
    shape: number[];
    strides: number[];
    offset: number;
    c_contiguous?: boolean | number;
    f_contiguous?: boolean | number;
    format?: string;
    itemsize?: number;
    ndim?: number;
    nbytes?: number;
    readonly?: boolean | number;
    release?: () => void;
};

export type PythonArraySource = PyProxyLike | PyBufferLike;

export type PythonLayoutOrder = "K" | "C" | "F" | "A" | "preserve";

export type PythonCopyPolicy = "never" | "if_needed" | "always";

export type PythonTransferOptions = {
    order?: PythonLayoutOrder;
    copy?: PythonCopyPolicy;
    dtype?: DType;
};

export type PythonGPUTransferOptions = PythonTransferOptions & {
    label?: string;
    copyDst?: boolean;
    copySrc?: boolean;
    usage?: GPUBufferUsageFlags;
};

export type PythonCopyIntoOptions = {
    copy?: PythonCopyPolicy;
    cast?: boolean;
};

export type PythonCopyOutOptions = {
    copy?: PythonCopyPolicy;
    extent?: boolean;
};

type ResolvedBuffer = {
    dtype: DType;
    itemsize: number;
    shape: number[];
    stridesBytes: number[];
    offsetBytes: number;
    extentBytes: number;
    numel: number;
    dense: boolean;
    overlapping: boolean;
    readonly: boolean;
    bytes: () => Uint8Array;
};

type RowRuns = { outerShape: number[]; outerStrides: number[]; runBytes: number };

type ImportPlan = { dtype: DType; stridesBytes: number[]; offsetBytes: number; byteLength: number; perm: number[]; direct: boolean; runs: RowRuns | null };

type ExportPlan = { from: CPUndarray | GPUndarray; temp: boolean; startBytes: number; sizeBytes: number; check: ResolvedBuffer };

const ROW_RUN_MIN_BYTES = 1024;

const ORDERS: ReadonlySet<string> = new Set(["K", "C", "F", "A", "preserve"]);

const COPIES: ReadonlySet<string> = new Set(["never", "if_needed", "always"]);

const DTYPES: ReadonlySet<string> = new Set(["i8", "u8", "i16", "u16", "i32", "u32", "f32", "f64", "c64", "c128"]);

const INTEGER_DTYPES: ReadonlySet<string> = new Set(["i8", "u8", "i16", "u16", "i32", "u32"]);

const isPyProxyLike = (x: unknown): x is PyProxyLike => typeof x === "object" && x !== null && typeof (x as PyProxyLike).getBuffer === "function";

const isPyBufferLike = (x: unknown): x is PyBufferLike => {
    const value = x as Partial<PyBufferLike> | null;
    return typeof value === "object" && value !== null && ArrayBuffer.isView(value.data) && Array.isArray(value.shape) && Array.isArray(value.strides);
};

const isComplex = (dtype: DType): boolean => dtype === "c64" || dtype === "c128";

const sameStrides = (shape: ReadonlyArray<number>, a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean => shape.every((dim, i) => dim <= 1 || a[i] === b[i]);

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

const SUPPORTED_DTYPES = "i8, u8, i16, u16, i32, u32, f32, f64, c64, or c128";

const formatDType = (format: string, itemsize: number | undefined): DType => {
    let code = format;
    if (code.length > 0 && "@=<>!".includes(code[0]!)) {
        assert(code[0] !== ">" && code[0] !== "!", `Unsupported Python buffer format '${format}': big-endian data is not supported, convert it to native byte order before importing`);
        code = code.slice(1);
    }
    assert(code !== "?", "Unsupported Python buffer dtype bool, cast to uint8 before importing");
    const signed = code.length === 1 && "bhilqn".includes(code), unsigned = code.length === 1 && "BHILQNP".includes(code);
    if (signed || unsigned) {
        const integers: Record<number, DType> = signed ? { 1: "i8", 2: "i16", 4: "i32" } : { 1: "u8", 2: "u16", 4: "u32" };
        const dtype = (itemsize !== undefined) ? integers[itemsize] : undefined;
        assert(dtype !== undefined, `Unsupported Python buffer format '${format}' with itemsize ${String(itemsize)}, expected ${SUPPORTED_DTYPES}`);
        return dtype;
    }
    const named: Record<string, DType> = { f: "f32", d: "f64", Zf: "c64", Zd: "c128" };
    const dtype = Object.hasOwn(named, code) ? named[code] : undefined;
    assert(dtype !== undefined, `Unsupported Python buffer format '${format}', expected ${SUPPORTED_DTYPES}`);
    return dtype;
};

const resolveBuffer = (buffer: PyBufferLike): ResolvedBuffer => {
    const data = buffer.data;
    assert(!(data instanceof DataView), "Python buffer DataView sources are not supported");
    const typed = dtypeOfTypedArray(data);
    assert(typed !== null, `Unsupported Python buffer dtype, expected ${SUPPORTED_DTYPES}`);
    const dtype = (buffer.format !== undefined) ? formatDType(buffer.format, buffer.itemsize) : typed;
    const info = dtypeInfo(dtype), itemsize = info.bytesPerElement;
    if (buffer.format !== undefined) assert(data instanceof Uint8Array || data instanceof info.ctor, `Python buffer data for format '${buffer.format}' must be a Uint8Array or ${info.ctor.name}`);
    const unit = (data as NumberTypedArray).BYTES_PER_ELEMENT;
    const shape = validateShape(buffer.shape, "Python buffer ");
    assert(buffer.strides.length === shape.length, "Python buffer strides/shape rank mismatch");
    if (buffer.ndim !== undefined) assert(Number.isSafeInteger(buffer.ndim) && buffer.ndim === shape.length, "Python buffer ndim does not match shape rank");
    if (buffer.itemsize !== undefined) assert(Number.isSafeInteger(buffer.itemsize) && buffer.itemsize === itemsize, "Python buffer itemsize does not match its typed data");
    const numel = numelFromShape(shape);
    assert(Number.isSafeInteger(numel * itemsize), "Python buffer byte length exceeds JavaScript's safe integer range");
    const offset = buffer.offset ?? 0;
    assert(Number.isSafeInteger(offset) && offset >= 0, "Python buffer offset must be a non-negative safe integer");
    let stridesBytes = new Array<number>(shape.length);
    let lo = 0, hi = 0;
    for (let i = 0; i < shape.length; i++) {
        const stride = buffer.strides[i];
        assert(Number.isSafeInteger(stride), `Python buffer strides[${i}] must be a safe integer`);
        stridesBytes[i] = stride * unit;
        const reach = (numel === 0) ? 0 : (shape[i]! - 1) * stridesBytes[i]!;
        if (reach < 0) lo += reach; else hi += reach;
    }
    const first = offset * unit, start = first + lo, extentBytes = (numel === 0) ? 0 : hi - lo + itemsize;
    assert(Number.isSafeInteger(first) && Number.isSafeInteger(start + extentBytes), "Python buffer range arithmetic overflowed");
    if (numel > 0) {
        assert(start >= 0, `Python buffer layout underflows its data: the lowest element lies ${-start} bytes before the start of the typed data view (negative strides need a larger offset)`);
        assert(start + extentBytes <= data.byteLength, "Python buffer offset/range is outside its typed data view");
    }
    if (buffer.nbytes !== undefined) assert(Number.isSafeInteger(buffer.nbytes) && buffer.nbytes === extentBytes, `Python buffer nbytes (${buffer.nbytes}) does not match the ${extentBytes}-byte span of its extent (shape, strides, and dtype)`);
    if (buffer.c_contiguous !== undefined) assert(!!buffer.c_contiguous === isContiguousRowMajor(shape, stridesBytes, itemsize), "Python buffer c_contiguous flag disagrees with its strides");
    if (buffer.f_contiguous !== undefined) assert(!!buffer.f_contiguous === isContiguousColumnMajor(shape, stridesBytes, itemsize), "Python buffer f_contiguous flag disagrees with its strides");
    if (numel === 0) stridesBytes = defaultRowMajorStridesBytes(shape, itemsize);
    else for (let i = 0; i < shape.length; i++) {
        const stride = stridesBytes[i]!, valid = (stride % itemsize) === 0 && stride >= -0x80000000 && stride <= 0x7FFFFFFF;
        if (shape[i] === 1) { if (!valid) stridesBytes[i] = 0; continue; }
        assert((stride % itemsize) === 0, `Python buffer strides[${i}] (${stride} bytes) is not a multiple of its ${itemsize}-byte itemsize; compact the array first (for example numpy.ascontiguousarray())`);
        assert(valid, `Python buffer strides[${i}] (${stride} bytes) does not fit in i32; compact the array first (for example numpy.ascontiguousarray())`);
        if (stride === 0) stridesBytes[i] = 0;
    }
    const layout = classifyLayout(shape, stridesBytes, itemsize);
    const base = data.byteOffset + (numel === 0 ? 0 : start);
    const bytes = (): Uint8Array => {
        assert(extentBytes === 0 || data.byteLength !== 0, "Python buffer memory was detached (its WebAssembly memory grew); acquire the buffer again");
        return new Uint8Array(data.buffer as ArrayBuffer, base, extentBytes);
    };
    return { dtype, itemsize, shape, stridesBytes, offsetBytes: layout.offsetBytes, extentBytes, numel, dense: layout.dense, overlapping: layout.overlapping, readonly: !!buffer.readonly, bytes };
};

const withResolvedSource = <T>(src: PythonArraySource, operation: (resolved: ResolvedBuffer) => T): T => {
    const acquired = isPyProxyLike(src);
    const buffer = acquired ? src.getBuffer("u8") : src;
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

const gpuWriteSource = (data: Uint8Array): BufferSource => {
    if ((data.byteOffset & 3) === 0) return data as unknown as BufferSource;
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    return copy;
};

const resolveOrder = (order: unknown, op: string): PythonLayoutOrder => {
    const value = order ?? "K";
    assert(typeof value === "string" && ORDERS.has(value), `PythonInterop.${op}(): order must be "K", "C", "F", "A", or "preserve" (got ${String(value)})`);
    return value as PythonLayoutOrder;
};

const resolveCopy = (copy: unknown, op: string): PythonCopyPolicy => {
    const value = copy ?? "if_needed";
    assert(typeof value === "string" && COPIES.has(value), `PythonInterop.${op}(): copy must be "never", "if_needed", or "always" (got ${String(value)})`);
    return value as PythonCopyPolicy;
};

const assertInteropCast = (src: DType, dst: DType, residency: "cpu" | "gpu", op: string): void => {
    assert(!isComplex(src) || isComplex(dst), `PythonInterop.${op}(): casting ${src} to ${dst} would discard imaginary parts; pass x.real or x.imag from Python (or compute.ndarray.real() or compute.ndarray.imag()) instead`);
    if (residency === "cpu") return;
    const wide = (dtype: DType): boolean => dtype === "f64" || dtype === "c128";
    assert(!(wide(src) !== wide(dst) && (INTEGER_DTYPES.has(src) || INTEGER_DTYPES.has(dst))), `PythonInterop.${op}(): ${src} to ${dst} casts are not supported on the GPU; cast in NumPy first or import to the CPU`);
};

const rowRuns = (shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>, itemsize: number, perm: ReadonlyArray<number>): RowRuns | null => {
    const axes = perm.filter((axis) => shape[axis]! > 1);
    let k = axes.length, run = itemsize;
    while (k > 0 && stridesBytes[axes[k - 1]!] === run) { run *= shape[axes[k - 1]!]!; k--; }
    if (run < ROW_RUN_MIN_BYTES) return null;
    const outer = axes.slice(0, k);
    return { outerShape: outer.map((axis) => shape[axis]!), outerStrides: outer.map((axis) => stridesBytes[axis]!), runBytes: run };
};

const copyRuns = (dst: Uint8Array, src: Uint8Array, offsetBytes: number, runs: RowRuns): void => {
    const { outerShape, outerStrides, runBytes } = runs;
    const index = new Array<number>(outerShape.length).fill(0);
    for (let from = offsetBytes, to = 0; ; to += runBytes) {
        dst.set(src.subarray(from, from + runBytes), to);
        let axis = outerShape.length - 1;
        for (; axis >= 0; axis--) {
            index[axis]!++;
            from += outerStrides[axis]!;
            if (index[axis]! < outerShape[axis]!) break;
            from -= outerStrides[axis]! * outerShape[axis]!;
            index[axis] = 0;
        }
        if (axis < 0) return;
    }
};

const readRange = (src: GPUndarray, startBytes: number, sizeBytes: number): { offset: number; size: number; delta: number } => {
    const at = src.baseOffsetBytes + startBytes, offset = at - (at & 3);
    return { offset, size: at - offset + sizeBytes, delta: at - offset };
};

const describeLayout = (shape: ReadonlyArray<number>, stridesBytes: ReadonlyArray<number>): string => `shape [${shape}] with strides [${stridesBytes}] bytes`;

export class PythonInterop {
    private readonly compute: Compute;

    constructor(compute: Compute) {
        this.compute = compute;
    }

    toCPU(src: PythonArraySource, options: PythonTransferOptions = {}): CPUndarray {
        const op = "toCPU";
        this.assertRuntime(op);
        const order = resolveOrder(options.order, op), copy = resolveCopy(options.copy, op), dtype = this.resolveDType(options.dtype, op);
        return withResolvedSource(src, (res) => {
            const plan = this.planImport(res, order, copy, dtype, "cpu", op);
            const out = CPUndarray.empty(plan.dtype, { shape: res.shape, stridesBytes: plan.stridesBytes, offsetBytes: plan.offsetBytes });
            try {
                if (plan.direct) { if (plan.byteLength > 0) out.backingBytes().set(res.bytes()); }
                else if (plan.runs) copyRuns(out.backingBytes(), res.bytes(), res.offsetBytes, plan.runs);
                else this.gather(out, plan.perm, res);
                return out;
            } catch (error) { out.destroy(); throw error; }
        });
    }

    toGPU(src: PythonArraySource, options: PythonGPUTransferOptions = {}): GPUndarray {
        const op = "toGPU";
        this.assertRuntime(op);
        const order = resolveOrder(options.order, op), copy = resolveCopy(options.copy, op), dtype = this.resolveDType(options.dtype, op);
        const desc = { label: options.label, copyDst: options.copyDst ?? true, copySrc: options.copySrc ?? true, usage: options.usage };
        return withResolvedSource(src, (res) => {
            const plan = this.planImport(res, order, copy, dtype, "gpu", op);
            const { device, queue } = this.compute;
            if (plan.direct) {
                const storage = new StorageBuffer(device, queue, { ...desc, data: res.bytes() as unknown as BufferSource });
                try { return new GPUndarray(plan.dtype, res.shape.slice(), plan.stridesBytes.slice(), plan.offsetBytes, plan.byteLength, storage, 0, true); }
                catch (error) { storage.destroy(); throw error; }
            }
            if (plan.runs) {
                const usage = GPUBufferUsage.STORAGE | (desc.copyDst ? GPUBufferUsage.COPY_DST : 0) | (desc.copySrc ? GPUBufferUsage.COPY_SRC : 0) | (desc.usage ?? 0);
                const size = alignTo(plan.byteLength, 4);
                const buffer = device.createBuffer({ label: desc.label, size, usage, mappedAtCreation: true });
                let storage: StorageBuffer | null = null;
                try {
                    copyRuns(new Uint8Array(buffer.getMappedRange()), res.bytes(), res.offsetBytes, plan.runs);
                    buffer.unmap();
                    storage = this.compute.wrapStorageBuffer(buffer, { ownBuffer: true, byteLength: size, label: desc.label });
                    return new GPUndarray(plan.dtype, res.shape.slice(), plan.stridesBytes.slice(), 0, plan.byteLength, storage, 0, true);
                } catch (error) { if (storage) storage.destroy(); else buffer.destroy(); throw error; }
            }
            const out = GPUndarray.empty({ device, queue }, plan.dtype, { shape: res.shape, stridesBytes: plan.stridesBytes }, desc);
            try { this.gather(out, plan.perm, res); return out; }
            catch (error) { out.destroy(); throw error; }
        });
    }

    copyInto(dst: CPUndarray | GPUndarray, src: PythonArraySource, options: PythonCopyIntoOptions = {}): void {
        const op = "copyInto";
        this.assertRuntime(op);
        const copy = resolveCopy(options.copy, op);
        assert(options.cast === undefined || typeof options.cast === "boolean", `PythonInterop.copyInto(): cast must be a boolean (got ${String(options.cast)})`);
        withResolvedSource(src, (res) => {
            assert(dst instanceof CPUndarray || dst instanceof GPUndarray, "PythonInterop.copyInto() destination must be a CPUndarray or GPUndarray");
            this.assertLive(dst, op);
            if (options.cast === true) assertInteropCast(res.dtype, dst.dtype, dst.residency, op);
            else assert(dst.dtype === res.dtype, `PythonInterop.copyInto() dtype mismatch: destination is ${dst.dtype}, source is ${res.dtype}; pass { cast: true } to convert`);
            try { broadcastStrides(res.shape, res.stridesBytes, dst.shape, "PythonInterop.copyInto()"); }
            catch { throw new Error(`PythonInterop.copyInto() shape mismatch: cannot broadcast source shape [${res.shape}] to destination shape [${dst.shape}]`); }
            assert(!mayAddressTwice(dst.shape, dst.stridesBytes, dst.bytesPerElement), "PythonInterop.copyInto(): the destination may address the same memory more than once (broadcast or overlapping strides)");
            if (dst instanceof GPUndarray) assert(dst.bytesPerElement >= 4 || dst.isContiguousC, "PythonInterop.copyInto(): GPU destinations with 8-bit or 16-bit dtypes must be C-contiguous");
            if (dst.numel === 0) return;
            const layout = classifyLayout(dst.shape, dst.stridesBytes, dst.bytesPerElement);
            const direct = dst.dtype === res.dtype && sameShape(dst.shape, res.shape) && res.dense && layout.dense && sameStrides(dst.shape, dst.stridesBytes, res.stridesBytes);
            const startBytes = dst.offsetBytes - layout.offsetBytes;
            let reason = direct ? "" : `the source (${res.dtype}, ${describeLayout(res.shape, res.stridesBytes)}) differs from the destination (${dst.dtype}, ${describeLayout(dst.shape, dst.stridesBytes)})`;
            if (direct && dst instanceof CPUndarray) { dst.backingBytes().set(res.bytes(), startBytes); return; }
            if (direct && dst instanceof GPUndarray) {
                const at = dst.baseOffsetBytes + startBytes, size = res.extentBytes;
                const writable = (dst.buffer.usage & GPUBufferUsage.COPY_DST) !== 0;
                if (writable && (at & 3) === 0 && ((size & 3) === 0 || at + size === dst.buffer.byteLength)) { dst.buffer.write(gpuWriteSource(res.bytes()), at, 0, size); return; }
                reason = writable ? "the GPU destination range is not 4-byte aligned, so it needs a staged merge" : "the GPU destination lacks COPY_DST usage, so it needs a staged gather";
            }
            assert(copy !== "never", `PythonInterop.copyInto(): copy="never" allows only the direct path (same dtype and shape and identical dense layouts), but ${reason}; use copy="if_needed"`);
            const stage = this.stage(res, dst.residency);
            try { this.compute.ndarray.copyInto(dst, stage); }
            finally { stage.destroy(); }
        });
    }

    copyOut(dst: PythonArraySource, src: CPUndarray, options?: PythonCopyOutOptions): void;
    copyOut(dst: PythonArraySource, src: GPUndarray, options?: PythonCopyOutOptions): Promise<void>;
    copyOut(dst: PythonArraySource, src: CPUndarray | GPUndarray, options?: PythonCopyOutOptions): void | Promise<void>;
    copyOut(dst: PythonArraySource, src: CPUndarray | GPUndarray, options: PythonCopyOutOptions = {}): void | Promise<void> {
        if (src instanceof GPUndarray) {
            try { return this.copyOutGPU(dst, src, options); }
            catch (error) { return Promise.reject(error); }
        }
        withResolvedSource(dst, (res) => {
            const plan = this.planExport(res, src, options);
            try { if (plan.sizeBytes > 0) res.bytes().set((plan.from as CPUndarray).backingBytes().subarray(plan.startBytes, plan.startBytes + plan.sizeBytes)); }
            finally { if (plan.temp) plan.from.destroy(); }
        });
    }

    private copyOutGPU(dst: PythonArraySource, src: GPUndarray, options: PythonCopyOutOptions): Promise<void> {
        const plan = withResolvedSource(dst, (res) => this.planExport(res, src, options));
        const from = plan.from as GPUndarray;
        try {
            if (plan.sizeBytes === 0) return Promise.resolve();
            const { offset, size, delta } = readRange(from, plan.startBytes, plan.sizeBytes);
            return this.compute.readback.snapshot(from.buffer, offset, size, (bytes) => withResolvedSource(dst, (res) => {
                const before = plan.check;
                assert(!res.readonly && res.dtype === before.dtype && sameShape(res.shape, before.shape) && res.stridesBytes.every((stride, i) => stride === before.stridesBytes[i]) && res.extentBytes === before.extentBytes, "PythonInterop.copyOut(): the destination Python buffer changed while the GPU readback was pending");
                res.bytes().set(bytes.subarray(delta, delta + plan.sizeBytes));
            }), { label: "PythonInterop.copyOut" });
        } finally { if (plan.temp) from.destroy(); }
    }

    private planExport(res: ResolvedBuffer, src: CPUndarray | GPUndarray, options: PythonCopyOutOptions): ExportPlan {
        const op = "copyOut";
        this.assertRuntime(op);
        assert(src instanceof CPUndarray || src instanceof GPUndarray, "PythonInterop.copyOut() source must be a CPUndarray or GPUndarray");
        this.assertLive(src, op);
        const copy = resolveCopy(options.copy, op);
        assert(options.extent === undefined || typeof options.extent === "boolean", `PythonInterop.copyOut(): extent must be a boolean (got ${String(options.extent)})`);
        assert(!res.readonly, "PythonInterop.copyOut(): the destination Python buffer is read-only");
        const gpu = src instanceof GPUndarray;
        if (options.extent === true) {
            assert(res.shape.length === 1 && res.itemsize === 1 && res.dense && res.extentBytes === src.byteLength, `PythonInterop.copyOut(): extent mode needs a contiguous 1-D byte buffer of exactly ${src.byteLength} bytes (the source's byteLength), got ${res.dtype} ${describeLayout(res.shape, res.stridesBytes)}`);
            if (gpu) this.assertReadable(src as GPUndarray, 0, src.byteLength, op);
            return { from: src, temp: false, startBytes: 0, sizeBytes: src.byteLength, check: res };
        }
        assert(res.dtype === src.dtype, `PythonInterop.copyOut(): destination dtype ${res.dtype} does not match the source dtype ${src.dtype}; export into a ${src.dtype} buffer and convert in NumPy`);
        assert(sameShape(res.shape, src.shape), `PythonInterop.copyOut(): destination shape [${res.shape}] does not match the source shape [${src.shape}]`);
        assert(res.dense, `PythonInterop.copyOut(): the destination must be dense without gaps or overlaps (got ${describeLayout(res.shape, res.stridesBytes)}); export into a dense array and numpy.copyto() it`);
        const size = src.numel * src.bytesPerElement;
        if (size === 0) return { from: src, temp: false, startBytes: 0, sizeBytes: 0, check: res };
        const layout = classifyLayout(src.shape, src.stridesBytes, src.bytesPerElement);
        const startBytes = src.offsetBytes - layout.offsetBytes;
        const same = layout.dense && sameStrides(src.shape, src.stridesBytes, res.stridesBytes);
        const readable = !gpu || this.readable(src as GPUndarray, startBytes, size);
        if (same && readable) return { from: src, temp: false, startBytes, sizeBytes: size, check: res };
        const reason = same ? "the GPU source cannot be read back directly (it lacks COPY_SRC usage or its 4-byte-aligned range leaves its buffer)" : `the source layout (${describeLayout(src.shape, src.stridesBytes)}) differs from the destination layout (${describeLayout(res.shape, res.stridesBytes)})`;
        assert(copy !== "never", `PythonInterop.copyOut(): copy="never" but ${reason}; use copy="if_needed" or order="preserve"`);
        const nd = this.compute.ndarray;
        const flips = src.shape.map((_, i) => i).filter((i) => src.shape[i]! > 1 && res.stridesBytes[i]! < 0);
        const flipped = flips.length ? nd.flip(src, flips) : src;
        const temp = nd.contiguous(nd.transpose(flipped, sortedStridePermutation(res.shape, res.stridesBytes)));
        return { from: temp, temp: true, startBytes: 0, sizeBytes: size, check: res };
    }

    private planImport(res: ResolvedBuffer, order: PythonLayoutOrder, copy: PythonCopyPolicy, dtype: DType | undefined, residency: "cpu" | "gpu", op: string): ImportPlan {
        const target = dtype ?? res.dtype, cast = target !== res.dtype;
        if (cast) assertInteropCast(res.dtype, target, residency, op);
        assert(!(order === "preserve" && cast), `PythonInterop.${op}(): order="preserve" keeps the source bytes exactly and cannot be combined with a dtype conversion (${res.dtype} to ${target}); use order="K" or convert after importing`);
        let plan: ImportPlan;
        if (order === "preserve") plan = { dtype: target, stridesBytes: res.stridesBytes, offsetBytes: res.offsetBytes, byteLength: res.extentBytes, perm: res.shape.map((_, i) => i), direct: true, runs: null };
        else {
            const itemsize = dtypeInfo(target).bytesPerElement;
            const { perm, stridesBytes } = orderedLayout(res.shape, res.stridesBytes, res.itemsize, order, itemsize);
            const direct = !cast && (res.numel === 0 || sameStrides(res.shape, res.stridesBytes, stridesBytes));
            const runs = (direct || cast || res.overlapping) ? null : rowRuns(res.shape, res.stridesBytes, res.itemsize, perm);
            plan = { dtype: target, stridesBytes, offsetBytes: 0, byteLength: res.numel * itemsize, perm, direct, runs };
            if (!direct) assert(copy !== "never", `PythonInterop.${op}(): copy="never" but importing ${res.dtype} ${describeLayout(res.shape, res.stridesBytes)} as order="${order}"${cast ? ` ${target}` : ""} needs a materialization (${cast ? "a dtype conversion" : "a layout change"}); use copy="if_needed" or order="preserve"`);
        }
        if (residency === "gpu") {
            const staged = !plan.direct && !plan.runs;
            this.assertGPULimits(plan.byteLength, "result", staged, op);
            if (staged) this.assertGPULimits(res.extentBytes, "staging extent", true, op);
        }
        return plan;
    }

    private assertGPULimits(byteLength: number, what: string, bound: boolean, op: string): void {
        const limits = this.compute.device.limits, bytes = alignTo(byteLength, 4);
        assert(bytes <= limits.maxBufferSize, `PythonInterop.${op}(): the ${bytes}-byte ${what} exceeds device.limits.maxBufferSize (${limits.maxBufferSize}); use order="K" or slice the array first`);
        if (bound) assert(bytes <= limits.maxStorageBufferBindingSize, `PythonInterop.${op}(): the ${bytes}-byte ${what} exceeds device.limits.maxStorageBufferBindingSize (${limits.maxStorageBufferBindingSize}); use order="K" or slice the array first`);
    }

    private gather(out: CPUndarray | GPUndarray, perm: ReadonlyArray<number>, res: ResolvedBuffer): void {
        const nd = this.compute.ndarray;
        const stage = this.stage(res, out.residency);
        try { nd.copyInto(nd.transpose(out, perm), nd.transpose(stage, perm)); }
        finally { stage.destroy(); }
    }

    private stage(res: ResolvedBuffer, residency: "cpu" | "gpu"): CPUndarray | GPUndarray {
        const layout = { shape: res.shape, stridesBytes: res.stridesBytes, offsetBytes: res.offsetBytes };
        if (residency === "cpu") {
            const stage = CPUndarray.empty(res.dtype, layout);
            try { if (res.extentBytes > 0) stage.backingBytes().set(res.bytes()); return stage; }
            catch (error) { stage.destroy(); throw error; }
        }
        const storage = new StorageBuffer(this.compute.device, this.compute.queue, { label: "PythonInterop:staging", data: res.bytes() as unknown as BufferSource, copyDst: false });
        try { return new GPUndarray(res.dtype, res.shape.slice(), res.stridesBytes.slice(), res.offsetBytes, res.extentBytes, storage, 0, true); }
        catch (error) { storage.destroy(); throw error; }
    }

    private readable(src: GPUndarray, startBytes: number, sizeBytes: number): boolean {
        if (!src.buffer.canReadback) return false;
        const { offset, size } = readRange(src, startBytes, sizeBytes);
        try { validateStorageBufferRange(src.buffer, offset, size, true); return true; }
        catch { return false; }
    }

    private assertReadable(src: GPUndarray, startBytes: number, sizeBytes: number, op: string): void {
        assert(src.buffer.canReadback, `PythonInterop.${op}(): reading a GPU array back requires COPY_SRC usage (copySrc: true) on its buffer`);
        assert(this.readable(src, startBytes, sizeBytes), `PythonInterop.${op}(): the 4-byte-aligned readback range of the GPU array leaves its buffer`);
    }

    private resolveDType(dtype: unknown, op: string): DType | undefined {
        if (dtype === undefined || dtype === null) return undefined;
        assert(typeof dtype === "string" && DTYPES.has(dtype), `PythonInterop.${op}(): dtype must be one of ${SUPPORTED_DTYPES} (got ${String(dtype)})`);
        return dtype as DType;
    }

    private assertRuntime(op: string): void {
        assert(!this.compute.readback.isDestroyed, `PythonInterop.${op}(): compute.ndarray has been destroyed`);
    }

    private assertLive(a: CPUndarray | GPUndarray, op: string): void {
        if (a instanceof CPUndarray) { assert(!a.destroyed, "CPUndarray has been destroyed"); return; }
        this.compute.ndarray.transpose(a);
        assert(a.buffer.device === this.compute.device, `PythonInterop.${op}(): the GPU array belongs to a different GPUDevice`);
    }
}
