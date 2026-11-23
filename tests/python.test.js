/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { destroyTestDevice, safelySilence, setupTest } from "./utils/helpers.js";
import { Compute, CPUndarray, GPUndarray, PythonInterop, dtypeInfo, initWebAssembly } from "../release/WasmGPU.js";

const { device } = await setupTest({ initWebAssembly, webgpu: true });
const compute = new Compute(device, device.queue);
const python = new PythonInterop(compute);

const stridesOf = (shape) => { const out = new Array(shape.length); let stride = 1; for (let i = shape.length - 1; i >= 0; i--) { out[i] = stride; stride *= shape[i]; } return out; };
const bufferOf = (data, shape, extra = {}) => ({ data, shape, strides: stridesOf(shape), offset: 0, c_contiguous: true, itemsize: data.BYTES_PER_ELEMENT, ndim: shape.length, nbytes: shape.reduce((n, dim) => n * dim, 1) * data.BYTES_PER_ELEMENT, ...extra });
const readGPU = async (array) => { const cpu = await compute.ndarray.toCPU(array); try { return Array.from(cpu.data()); } finally { cpu.destroy(); } };
const viewOf = (data, shape, strides, offset = 0, extra = {}) => { const unit = data.BYTES_PER_ELEMENT, empty = shape.includes(0); let lo = 0, hi = 0; shape.forEach((dim, i) => { const reach = (dim - 1) * strides[i] * unit; if (reach < 0) lo += reach; else hi += reach; }); return { data, shape, strides, offset, itemsize: unit, ndim: shape.length, nbytes: empty ? 0 : hi - lo + (extra.itemsize ?? unit), ...extra }; };
const logical = (data, shape, strides, offset) => { const out = [], index = shape.map(() => 0); for (let k = 0, n = shape.reduce((a, b) => a * b, 1); k < n; k++) { out.push(data[shape.reduce((at, _, i) => at + index[i] * strides[i], offset)]); for (let i = shape.length - 1; i >= 0 && ++index[i] === shape[i]; i--) index[i] = 0; } return out; };
const valuesOf = async (array) => { const c = compute.ndarray.contiguous(array); try { return (c.residency === "cpu") ? Array.from(c.data()) : await readGPU(c); } finally { c.destroy(); } };
const rejects = async (promise, pattern) => { let error = null; try { await promise; } catch (caught) { error = caught; } assert.ok(pattern.test(String(error?.message)), `expected a rejection matching ${pattern}, got ${error?.message}`); };

// 1) All supported dtypes preserve exact values through canonical CPU and direct GPU imports.
{
    const cases = [
        [Int8Array, [-3, 0, 7]], [Uint8Array, [0, 7, 255]],
        [Int16Array, [-300, 0, 700]], [Uint16Array, [0, 700, 65535]],
        [Int32Array, [-300000, 0, 700000]], [Uint32Array, [0, 700000, 4000000000]],
        [Float32Array, [-1.25, 0, 3.5]], [Float64Array, [-Math.PI, 0, Math.E]]
    ];
    for (const [Ctor, values] of cases) {
        const source = bufferOf(new Ctor(values), [3]);
        const cpu = python.toCPU(source);
        const gpu = python.toGPU(source);
        try {
            assert.deepStrictEqual(Array.from(cpu.data()), Array.from(new Ctor(values)));
            assert.deepStrictEqual(await readGPU(gpu), Array.from(new Ctor(values)));
            assert.strictEqual(cpu.isContiguousC, true);
            assert.strictEqual(gpu.isContiguousC, true);
            assert.strictEqual(cpu.offsetBytes, 0);
            assert.strictEqual(gpu.offsetBytes, 0);
        } finally { cpu.destroy(); gpu.destroy(); }
    }

    // Formatted buffers resolve their dtype from format and itemsize, with strides and offsets in units of their data.
    const formatted = [
        ["c64", "Zf", new Float32Array([1.5, -2, 0, 3.25]), 0],
        ["c128", "Zd", new Float64Array([Math.PI, -Math.E, 1e300, -0]), 0],
        ["c128", "<Zd", new Float64Array([9, 9, -1, 0.5, 2, -4]), 2],
        ["i32", "<i", new Int32Array([-5, 6]), 0]
    ];
    for (const [dtype, format, typed, skip] of formatted) {
        const itemsize = dtypeInfo(dtype).bytesPerElement, components = dtypeInfo(dtype).components, count = (typed.length - skip) / components;
        const values = Array.from(typed.subarray(skip));
        const bytes = new Uint8Array(typed.buffer);
        for (const data of [typed, bytes]) {
            const unit = data.BYTES_PER_ELEMENT;
            const source = { data, shape: [count], strides: [itemsize / unit], offset: skip * typed.BYTES_PER_ELEMENT / unit, format, itemsize, ndim: 1, nbytes: count * itemsize, c_contiguous: true };
            const cpu = python.toCPU(source);
            const gpu = python.toGPU(source);
            try {
                assert.deepStrictEqual([cpu.dtype, gpu.dtype, cpu.shape], [dtype, dtype, [count]], `${format} over ${data.constructor.name}`);
                assert.deepStrictEqual(Array.from(cpu.data()), values, `${format} over ${data.constructor.name} CPU values`);
                assert.deepStrictEqual(await readGPU(gpu), values, `${format} over ${data.constructor.name} GPU values`);
            } finally { cpu.destroy(); gpu.destroy(); }
        }
    }
}

// 2) Scalars, empty dimensions, multidimensional shapes, offsets, explicit strides, and unaligned bytes are supported.
{
    const scalar = python.toCPU(bufferOf(new Float32Array([4.5]), []));
    const empty = python.toCPU(bufferOf(new Uint16Array(0), [2, 0, 3]));
    const matrix = python.toCPU(bufferOf(new Int32Array([1, 2, 3, 4, 5, 6]), [2, 3]));
    const offset = python.toCPU(bufferOf(new Uint8Array([99, 7, 8, 9]), [3], { offset: 1, nbytes: 3 }));
    try {
        assert.deepStrictEqual(scalar.shape, []); assert.deepStrictEqual(Array.from(scalar.data()), [4.5]);
        assert.deepStrictEqual(empty.shape, [2, 0, 3]); assert.strictEqual(empty.numel, 0);
        assert.deepStrictEqual(matrix.stridesBytes, [12, 4]); assert.deepStrictEqual(Array.from(matrix.data()), [1, 2, 3, 4, 5, 6]);
        assert.deepStrictEqual(Array.from(offset.data()), [7, 8, 9]);
    } finally { scalar.destroy(); empty.destroy(); matrix.destroy(); offset.destroy(); }

    const unalignedGPU = python.toGPU(bufferOf(new Uint8Array([99, 4, 5, 6]), [3], { offset: 1, nbytes: 3 }));
    try { assert.deepStrictEqual(await readGPU(unalignedGPU), [4, 5, 6]); }
    finally { unalignedGPU.destroy(); }
    const doubles = new Float64Array([Math.PI, -0, Infinity]), unaligned = new Uint8Array(25); unaligned.set(new Uint8Array(doubles.buffer), 1);
    for (const source of [{ data: unaligned, shape: [3], strides: [8], offset: 1, format: "d", itemsize: 8, nbytes: 24 }, { data: new Float64Array([9, ...doubles, 9]), shape: [3], strides: [1], offset: 1, c_contiguous: 1, f_contiguous: 1, nbytes: 24 }]) {
        const cpu = python.toCPU(source), gpu = python.toGPU(source);
        try { assert.deepStrictEqual([Array.from(cpu.data()), await readGPU(gpu)], [Array.from(doubles), Array.from(doubles)], "unaligned bytes and data larger than the extent"); }
        finally { cpu.destroy(); gpu.destroy(); }
    }

    const readonlyGPU = python.toGPU(bufferOf(new Float32Array([1, 2]), [2], { readonly: true }), { label: "python:readonly", usage: GPUBufferUsage.VERTEX });
    try {
        assert.strictEqual(readonlyGPU.buffer.label, "python:readonly");
        assert.ok((readonlyGPU.buffer.usage & GPUBufferUsage.STORAGE) !== 0);
        assert.ok((readonlyGPU.buffer.usage & GPUBufferUsage.COPY_SRC) !== 0);
        assert.ok((readonlyGPU.buffer.usage & GPUBufferUsage.COPY_DST) !== 0);
        assert.ok((readonlyGPU.buffer.usage & GPUBufferUsage.VERTEX) !== 0);
    } finally { readonlyGPU.destroy(); }
}

// 3) Invalid layouts, metadata, options, shapes, ranges, and typed views fail clearly.
{
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(4), [2, 2], { c_contiguous: false })), /c_contiguous flag disagrees with its strides/);
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(4), [2, 2], { strides: [-2, 1], c_contiguous: undefined })), /underflows/);
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(4), [2, 2], { strides: [2] })), /rank/i);
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(4), [2, 2], { ndim: 1 })), /ndim/i);
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(4), [2, 2], { itemsize: 8 })), /itemsize/i);
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(4), [2, 2], { nbytes: 12 })), /nbytes/i);
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(1), [-1])), /shape/i);
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(1), [0x100000000])), /u32/i);
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(1), [0xFFFFFFFF, 0xFFFFFFFF])), /safe integer/i);
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(2), [2], { offset: 1 })), /range/i);
    assert.throws(() => python.toCPU(bufferOf(new BigInt64Array(1), [1])), /dtype/i);
    assert.throws(() => python.toCPU(bufferOf(new Uint8ClampedArray(1), [1])), /dtype/i);
    assert.throws(() => python.toCPU(bufferOf(new Uint8Array([0, 1]), [2], { format: "?" })), /bool/i);
    const raw = (format, itemsize, extra = {}) => ({ data: new Uint8Array(4 * itemsize), shape: [2], strides: [itemsize], offset: 0, format, itemsize, ...extra });
    assert.throws(() => python.toCPU(raw(">f", 4)), /format '>f': big-endian data is not supported/);
    assert.throws(() => python.toCPU(raw("!Zd", 16)), /big-endian/);
    assert.throws(() => python.toCPU(raw("q", 8)), /Unsupported Python buffer format 'q' with itemsize 8, expected i8, u8, i16, u16, i32, u32, f32, f64, c64, or c128/);
    assert.throws(() => python.toCPU(raw("e", 2)), /Unsupported Python buffer format 'e', expected .*c64, or c128/);
    assert.throws(() => python.toCPU(raw("Zg", 32)), /Unsupported Python buffer format 'Zg'/);
    assert.throws(() => python.toCPU(raw("Zf", 4)), /itemsize/i);
    assert.throws(() => python.toCPU(raw("Zf", 8, { data: new Float64Array(4), strides: [1] })), /must be a Uint8Array or Float32Array/);
    assert.throws(() => python.toCPU({ data: new DataView(new ArrayBuffer(4)), shape: [1], strides: [1], offset: 0 }), /DataView/i);
    assert.throws(() => python.toCPU(new Float32Array([1])), /Pyodide|PyBufferLike/i);
    const fortran = viewOf(new Float32Array(4), [2, 2], [1, 2]);
    for (const [run, pattern] of [
        [() => python.toCPU(viewOf(new Float32Array(4), [2], [2], 0, { nbytes: 8 })), /nbytes \(8\) does not match the 12-byte span/],
        [() => python.toCPU({ data: new Uint8Array(20), shape: [3], strides: [5], offset: 0, format: "f", itemsize: 4 }), /not a multiple of its 4-byte itemsize/],
        [() => python.toCPU(fortran, { order: "X" }), /order must be "K", "C", "F", "A", or "preserve"/],
        [() => python.toCPU(fortran, { dtype: "f16" }), /dtype must be one of/],
        [() => python.toCPU(fortran, { order: "C", copy: "never" }), /copy="never" but importing f32 shape \[2,2\] with strides \[4,8\] bytes as order="C" needs a materialization/],
        [() => python.toGPU(fortran, { order: "preserve", dtype: "f64" }), /order="preserve" .* cannot be combined with a dtype conversion/],
        [() => python.toGPU(bufferOf(new Int32Array(4), [4]), { dtype: "f64" }), /i32 to f64 casts are not supported on the GPU/],
        [() => python.toCPU({ data: new Float32Array(4), shape: [2], strides: [2], offset: 0, format: "Zf", itemsize: 8 }, { dtype: "f32" }), /pass x.real or x.imag/],
        [() => python.toGPU(viewOf(new Uint8Array(2), [1 << 30, 2], [0, 1])), /maxBufferSize/]
    ]) assert.throws(run, pattern);
    python.toCPU(fortran, { copy: "never" }).destroy();
}

// 4) In-place copies validate before writing, keep the destination allocation, and accept any non-self-overlapping layout, broadcasting, and casts.
{
    const cpu = CPUndarray.zeros("f32", { shape: [2, 2] });
    const cpuPtr = cpu.basePtrBytes;
    python.copyInto(cpu, bufferOf(new Float32Array([1, 2, 3, 4]), [2, 2]));
    assert.strictEqual(cpu.basePtrBytes, cpuPtr);
    assert.deepStrictEqual(Array.from(cpu.data()), [1, 2, 3, 4]);
    assert.throws(() => python.copyInto(cpu, bufferOf(new Float32Array(4), [4])), /shape mismatch/i);
    assert.throws(() => python.copyInto(cpu, bufferOf(new Int32Array(4), [2, 2])), /dtype mismatch/i);
    assert.throws(() => python.copyInto(cpu, viewOf(new Float32Array([5, 6, 7, 8]), [2, 2], [1, 2]), { copy: "never" }), /copy="never" allows only the direct path/);
    assert.deepStrictEqual(Array.from(cpu.data()), [1, 2, 3, 4], "failed validation must not mutate the destination");
    for (const [source, options, expected] of [[viewOf(new Float32Array([5, 6, 7, 8]), [2, 2], [1, 2]), {}, [5, 7, 6, 8]], [bufferOf(new Float32Array([9, 10]), [2]), {}, [9, 10, 9, 10]], [bufferOf(new Int16Array([-1, 2, -3, 4]), [2, 2]), { cast: true }, [-1, 2, -3, 4]]]) {
        python.copyInto(cpu, source, options);
        assert.deepStrictEqual([Array.from(cpu.data()), cpu.basePtrBytes], [expected, cpuPtr], "F-ordered, broadcast, and cast sources");
    }

    const noncontiguousCPU = CPUndarray.zeros("f32", { shape: [2, 2], stridesBytes: [16, 4] });
    python.copyInto(noncontiguousCPU, bufferOf(new Float32Array([1, 2, 3, 4]), [2, 2]));
    assert.deepStrictEqual(await valuesOf(noncontiguousCPU), [1, 2, 3, 4]);
    noncontiguousCPU.destroy();
    cpu.destroy();
    assert.throws(() => python.copyInto(cpu, bufferOf(new Float32Array(4), [2, 2])), /destroyed/i);

    const gpu = GPUndarray.empty(compute, "u8", { shape: [3] }, { copySrc: true });
    const gpuBuffer = gpu.buffer;
    python.copyInto(gpu, bufferOf(new Uint8Array([99, 8, 9, 10]), [3], { offset: 1, nbytes: 3 }));
    assert.strictEqual(gpu.buffer, gpuBuffer);
    assert.deepStrictEqual(await readGPU(gpu), [8, 9, 10]);
    gpu.destroy();

    const noCopyDst = GPUndarray.empty(compute, "f32", { shape: [1] }, { copyDst: false, copySrc: true });
    assert.throws(() => python.copyInto(noCopyDst, bufferOf(new Float32Array([1]), [1]), { copy: "never" }), /COPY_DST/i);
    python.copyInto(noCopyDst, bufferOf(new Float32Array([3]), [1]));
    assert.deepStrictEqual(await readGPU(noCopyDst), [3], "destinations without COPY_DST use the staged gather");
    noCopyDst.destroy();

    const noncontiguousGPU = GPUndarray.empty(compute, "f32", { shape: [2, 2], stridesBytes: [16, 4] });
    python.copyInto(noncontiguousGPU, viewOf(new Float32Array([1, 2, 3, 4]), [2, 2], [1, 2]));
    assert.deepStrictEqual(await valuesOf(noncontiguousGPU), [1, 3, 2, 4]);
    noncontiguousGPU.destroy();
    const halfGPU = GPUndarray.empty(compute, "u16", { shape: [2, 2], stridesBytes: [8, 2] });
    assert.throws(() => python.copyInto(halfGPU, bufferOf(new Uint16Array(4), [2, 2])), /8-bit or 16-bit dtypes must be C-contiguous/);
    halfGPU.destroy();

    const offsetCPU = CPUndarray.zeros("f32", { shape: [3], offsetBytes: 8 });
    python.copyInto(offsetCPU, bufferOf(new Float32Array([5, 6, 7]), [3]));
    assert.deepStrictEqual(Array.from(offsetCPU.data()), [5, 6, 7], "Offset contiguous CPU destinations must be written at their layout offset");
    offsetCPU.destroy();
    const offsetGPU = GPUndarray.empty(compute, "f32", { shape: [3], offsetBytes: 8 }, { copySrc: true });
    python.copyInto(offsetGPU, bufferOf(new Float32Array([5, 6, 7]), [3]));
    assert.deepStrictEqual(await readGPU(offsetGPU), [5, 6, 7], "Offset contiguous GPU destinations must be written at their layout offset");
    offsetGPU.destroy();
    const row = compute.ndarray.zeros("u16", { shape: [6] }, { residency: "gpu" });
    python.copyInto(compute.ndarray.slice(row, [[1, 4]]), bufferOf(new Uint16Array([7, 8, 9]), [3]));
    assert.deepStrictEqual(await readGPU(row), [0, 7, 8, 9, 0, 0], "Unaligned sub-word GPU views must be written without touching neighbors");
    row.destroy();
    const gpuView = compute.ndarray.zeros("f32", { shape: [2, 4] }, { residency: "gpu" });
    python.copyInto(compute.ndarray.slice(gpuView, "::-1, ::2"), bufferOf(new Float32Array([3, 4]), [2]));
    python.copyInto(compute.ndarray.slice(gpuView, ":, 1::2"), bufferOf(new Int16Array([-1, -2, -3, -4]), [2, 2]), { cast: true });
    assert.deepStrictEqual(await readGPU(gpuView), [3, -1, 4, -2, 3, -3, 4, -4], "GPU views accept broadcast and cast sources");
    gpuView.destroy();
}

// 5) Acquired buffers release exactly once; borrowed buffers never release.
{
    let borrowedReleases = 0;
    const borrowed = bufferOf(new Float32Array([1]), [1], { release: () => borrowedReleases++ });
    python.toCPU(borrowed).destroy();
    assert.throws(() => python.toCPU({ ...borrowed, c_contiguous: false }), /c_contiguous flag/);
    assert.strictEqual(borrowedReleases, 0);

    const runAcquired = (buffer, operation) => {
        let acquisitions = 0, releases = 0;
        const proxy = { getBuffer() { acquisitions++; return { ...buffer, release() { releases++; } }; } };
        operation(proxy);
        assert.strictEqual(acquisitions, 1); assert.strictEqual(releases, 1);
    };
    runAcquired(bufferOf(new Float32Array([1]), [1]), (src) => python.toCPU(src).destroy());
    runAcquired(bufferOf(new Float32Array([1]), [1], { c_contiguous: false }), (src) => assert.throws(() => python.toCPU(src)));
    const dst = CPUndarray.empty("f32", { shape: [2] });
    runAcquired(bufferOf(new Float32Array([1, 2, 3]), [3]), (src) => assert.throws(() => python.copyInto(dst, src)));
    runAcquired(viewOf(new Float32Array(4), [2, 2], [1, 2]), (src) => python.toGPU(src, { order: "C" }).destroy());
    runAcquired(bufferOf(new Float32Array([1]), [1]), (src) => python.copyInto(dst, src));
    runAcquired(bufferOf(new Float32Array(2), [2]), (out) => python.copyOut(out, dst));
    runAcquired(bufferOf(new Float32Array(2), [2], { readonly: 1 }), (out) => assert.throws(() => python.copyOut(out, dst), /read-only/));
    const dstGPU = compute.ndarray.toGPU(dst);
    for (const readonly of [0, 1]) {
        let acquisitions = 0, releases = 0; const out = { getBuffer() { acquisitions++; return { ...bufferOf(new Float32Array(2), [2]), readonly, release() { releases++; } }; } };
        await (readonly ? rejects(python.copyOut(out, dstGPU), /read-only/) : python.copyOut(out, dstGPU));
        assert.deepStrictEqual([acquisitions, releases], readonly ? [1, 1] : [2, 2], "GPU exports acquire the destination again after the map");
    }
    dstGPU.destroy();
    dst.destroy();

    const originalEmpty = CPUndarray.empty;
    let partialDestroyed = 0;
    CPUndarray.empty = (...args) => {
        const result = originalEmpty(...args);
        result.data = result.backingBytes = () => { throw new Error("injected CPU copy failure"); };
        const destroy = result.destroy.bind(result);
        result.destroy = () => { partialDestroyed++; destroy(); };
        return result;
    };
    try {
        runAcquired(bufferOf(new Float32Array([1]), [1]), (src) => assert.throws(() => python.toCPU(src), /injected/));
        runAcquired(viewOf(new Float32Array(4), [2, 2], [1, 2]), (src) => assert.throws(() => python.toCPU(src, { order: "C" }), /injected/));
        assert.strictEqual(partialDestroyed, 3, "the materialized path destroys both its result and its staging array");
    } finally { CPUndarray.empty = originalEmpty; }

    const originalCreateBuffer = device.createBuffer;
    device.createBuffer = () => { throw new Error("injected GPU allocation failure"); };
    try {
        runAcquired(bufferOf(new Float32Array([1]), [1]), (src) => assert.throws(() => python.toGPU(src), /injected GPU/));
    } finally { device.createBuffer = originalCreateBuffer; }

    const noCopyDst = GPUndarray.empty(compute, "f32", { shape: [1] }, { copyDst: false });
    try {
        runAcquired(bufferOf(new Float32Array([1]), [1]), (src) => assert.throws(() => python.copyInto(noCopyDst, src, { copy: "never" }), /COPY_DST/));
        runAcquired(bufferOf(new Float32Array([1]), [1]), (src) => python.copyInto(noCopyDst, src));
    } finally { noCopyDst.destroy(); }

    let originalErrorReleases = 0;
    const invalid = { getBuffer: () => bufferOf(new Float32Array([1]), [1], { c_contiguous: false, release() { originalErrorReleases++; throw new Error("release failure"); } }) };
    assert.throws(() => python.toCPU(invalid), /c_contiguous flag/);
    assert.strictEqual(originalErrorReleases, 1);
}

// 6) Imports follow the K, C, F, A, and "preserve" orders, return owning roots on both residencies, and copy long contiguous runs directly.
{
    const base = Float32Array.from({ length: 24 }, (_, i) => i * 1.5 - 7.5);
    for (const [data, shape, strides, offset, expected] of [
        [base, [4, 6], [1, 4], 0, { K: [4, 16], C: [24, 4], F: [4, 16], A: [4, 16], preserve: [[4, 16], 0, 96] }],
        [base, [4, 6], [-6, 1], 18, { K: [24, 4], C: [24, 4], F: [4, 16], A: [24, 4], preserve: [[-24, 4], 72, 96] }],
        [base, [4, 3], [6, 2], 0, { K: [12, 4], C: [12, 4], F: [4, 16], A: [12, 4], preserve: [[24, 8], 0, 92] }]
    ]) for (const order of ["K", "C", "F", "A", "preserve"]) for (const toResidency of ["toCPU", "toGPU"]) {
        const result = python[toResidency](viewOf(data, shape, strides, offset), { order }), [stridesBytes, offsetBytes, byteLength] = (order === "preserve") ? expected.preserve : [expected[order], 0, shape[0] * shape[1] * 4];
        try { assert.deepStrictEqual([result.stridesBytes, result.offsetBytes, result.byteLength, result.base, await valuesOf(result)], [stridesBytes, offsetBytes, byteLength, null, logical(data, shape, strides, offset)], `${toResidency} [${shape}]/[${strides}] order ${order}`); } finally { result.destroy(); }
    }
    const bytes = Uint8Array.from({ length: 3300 }, (_, i) => (i * 7) % 251);
    for (const [toResidency, dtype] of [["toCPU", "f64"], ["toGPU", "c64"]]) {
        const wide = python[toResidency](viewOf(base, [4, 6], [1, 4]), { dtype }), rows = python[toResidency](viewOf(bytes, [3, 1025], [1100, 1]));
        try { assert.deepStrictEqual([wide.dtype, wide.stridesBytes, (await valuesOf(wide)).filter((_, i) => dtype === "f64" || i % 2 === 0), rows.byteLength, await valuesOf(rows)], [dtype, [8, 32], logical(base, [4, 6], [1, 4], 0), 3075, logical(bytes, [3, 1025], [1100, 1], 0)], "dtype conversions keep the K layout, and odd-byte row runs copy directly"); } finally { wide.destroy(); rows.destroy(); }
    }
}

// 7) Exports write dense Python buffers in any axis order, extent mode copies the backing bytes, and GPU exports snapshot at call time.
{
    const values = Array.from({ length: 24 }, (_, i) => i - 4.25);
    for (const residency of ["cpu", "gpu"]) {
        const cpu = compute.ndarray.fromArray("f32", [2, 3, 4], values), src = (residency === "gpu") ? compute.ndarray.toGPU(cpu) : cpu;
        try {
            for (const [strides, offset] of [[[12, 4, 1], 0], [[1, 2, 6], 0], [[1, 8, 2], 0], [[-12, 4, 1], 12]]) {
                const out = viewOf(new Float32Array(24), [2, 3, 4], strides, offset); await python.copyOut(out, src);
                const expected = new Array(24); logical(Array.from({ length: 24 }, (_, i) => i), [2, 3, 4], strides, offset).forEach((at, k) => { expected[at] = values[k]; });
                assert.deepStrictEqual(Array.from(out.data), expected, `${residency} export into strides [${strides}]`);
            }
            const never = viewOf(new Float32Array(24), [2, 3, 4], [1, 2, 6]);
            if (residency === "cpu") assert.throws(() => python.copyOut(never, src, { copy: "never" }), /copy="never"/); else await rejects(python.copyOut(never, src, { copy: "never" }), /copy="never"/);
            const view = compute.ndarray.slice(src, "::-1, 1:, ::2"), out = viewOf(new Float32Array(8), [2, 2, 2], [4, 2, 1]), extent = viewOf(new Uint8Array(view.byteLength), [view.byteLength], [1]);
            await python.copyOut(out, view); await python.copyOut(extent, view, { extent: true, copy: "never" });
            const start = (residency === "cpu") ? view.basePtrBytes - cpu.basePtrBytes : view.baseOffsetBytes;
            assert.deepStrictEqual([Array.from(out.data), Array.from(extent.data)], [await valuesOf(view), Array.from(new Uint8Array(new Float32Array(values).buffer).subarray(start, start + view.byteLength))], `${residency} materialized and extent exports`);
            for (const [out, pattern] of [[{ ...bufferOf(new Float32Array(24), [2, 3, 4]), readonly: 1 }, /read-only/], [bufferOf(new Int32Array(24), [2, 3, 4]), /dtype i32 does not match the source dtype f32/], [viewOf(new Float32Array(48), [2, 3, 4], [24, 8, 2]), /must be dense/], [bufferOf(new Uint8Array(8), [8]), /extent mode needs/]]) {
                if (residency === "cpu") assert.throws(() => python.copyOut(out, src, { extent: out.data.length === 8 }), pattern); else await rejects(python.copyOut(out, src, { extent: out.data.length === 8 }), pattern);
            }
        } finally { if (src !== cpu) src.destroy(); cpu.destroy(); }
    }
    for (const [dtype, Ctor, format, n] of [["u8", Uint8Array, "B", 1], ["c128", Float64Array, "Zd", 2]]) {
        const cpu = compute.ndarray.fromArray(dtype, [2, 3], Array.from({ length: 6 * n }, (_, i) => i * 37 % 251)), gpu = compute.ndarray.toGPU(cpu), want = await valuesOf(compute.ndarray.transpose(cpu));
        for (const src of [cpu, gpu]) { const out = viewOf(new Ctor(6 * n), [3, 2], [2 * n, n], 0, { format, itemsize: Ctor.BYTES_PER_ELEMENT * n }); await python.copyOut(out, compute.ndarray.transpose(src)); assert.deepStrictEqual(Array.from(out.data), want, `${dtype} ${src.residency} sub-word and complex exports`); }
        cpu.destroy(); gpu.destroy();
    }
    const snapshot = compute.ndarray.fromArray("f32", [4], [1, 2, 3, 4], { residency: "gpu" }), early = viewOf(new Float32Array(4), [4], [1]), late = viewOf(new Float32Array(4), [4], [1]);
    await Promise.all([python.copyOut(early, snapshot), snapshot.buffer.write(new Float32Array([9, 9, 9, 9])), python.copyOut(late, snapshot), snapshot.destroy()]);
    assert.deepStrictEqual([Array.from(early.data), Array.from(late.data)], [[1, 2, 3, 4], [9, 9, 9, 9]], "GPU exports snapshot at call time, even when the source is destroyed afterwards");
    const hidden = GPUndarray.empty(compute, "f32", { shape: [3] }, { copySrc: false }), fromHidden = viewOf(new Float32Array(3), [3], [1]);
    python.copyInto(hidden, bufferOf(new Float32Array([4, 5, 6]), [3]));
    await rejects(python.copyOut(fromHidden, hidden, { copy: "never" }), /COPY_SRC/); await python.copyOut(fromHidden, hidden);
    assert.deepStrictEqual(Array.from(fromHidden.data), [4, 5, 6], "sources without COPY_SRC are read back through an owned temporary");
    hidden.destroy();
}

// 8) Real Pyodide + NumPy validates metadata, normalization, conversion, and canonical round trips.
{
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.js";
    await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
    const pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/" });
    await safelySilence("log", () => pyodide.loadPackage("numpy"));
    const source = await (await fetch("../python/interop.py")).text();
    pyodide.globals.set("_wasmgpu_runtime", { python, compute });
    await pyodide.runPythonAsync(`${source}\ninterop = WasmGPUInterop(_wasmgpu_runtime)`);

    const results = await pyodide.runPythonAsync(
`
import numpy as np
a = np.arange(6, dtype=np.float32).reshape(2, 3)
cpu = interop.to_cpu(a)
cpu_back = interop.from_cpu(cpu)
view_cpu = interop.to_cpu(a[:, ::2])
view_back = interop.from_cpu(view_cpu)
converted_cpu = interop.to_cpu(np.arange(4, dtype=np.int16), dtype="f32")
converted = interop.from_cpu(converted_cpu)
gpu = interop.to_gpu(a)
gpu_back = await interop.from_gpu(gpu)
cpu_dst = interop.to_cpu(np.zeros_like(a))
interop.copy_into(cpu_dst, a + 10)
cpu_copy = interop.from_cpu(cpu_dst)
gpu_dst = interop.to_gpu(np.zeros_like(a))
interop.copy_into(gpu_dst, a + 20)
gpu_copy = await interop.from_gpu(gpu_dst)
z = (np.arange(6, dtype=np.float32) - 1j * np.arange(6, dtype=np.float32)[::-1]).astype(np.complex64).reshape(2, 3)
w = np.fft.fft(np.arange(5.0))
z_cpu = interop.to_cpu(z)
z_view = interop.to_cpu(z[:, ::-2])
z_gpu = interop.to_gpu(z)
w_cpu = interop.to_cpu(w)
w_gpu = interop.to_gpu(w)
z_dst = interop.to_gpu(np.zeros_like(z))
interop.copy_into(z_dst, z * 2)
w_dst = interop.to_cpu(np.zeros_like(w))
interop.copy_into(w_dst, w + 1j)
promoted = interop.to_cpu(np.arange(3, dtype=np.float32), dtype="c64")
narrowed = interop.to_cpu(w, dtype="c64", casting="same_kind")
def rejected(run):
    try:
        run()
    except WasmGPUInteropError:
        return True
    return False
complex_checks = [
    [str(z_cpu.dtype), str(z_gpu.dtype), str(w_cpu.dtype), str(w_gpu.dtype), str(promoted.dtype), str(narrowed.dtype)],
    [
        (lambda b: b.dtype == np.complex64 and np.array_equal(b, z))(interop.from_cpu(z_cpu)),
        (lambda b: b.dtype == np.complex64 and np.array_equal(b, z[:, ::-2]))(interop.from_cpu(z_view)),
        (lambda b: b.dtype == np.complex64 and np.array_equal(b, z))(await interop.from_gpu(z_gpu)),
        (lambda b: b.dtype == np.complex128 and np.array_equal(b, w))(interop.from_cpu(w_cpu)),
        (lambda b: b.dtype == np.complex128 and np.array_equal(b, w))(await interop.from_gpu(w_gpu)),
        np.array_equal(await interop.from_gpu(z_dst), z * 2),
        np.array_equal(interop.from_cpu(w_dst), w + 1j),
        np.array_equal(interop.from_cpu(promoted), np.arange(3, dtype=np.complex64)),
        np.array_equal(interop.from_cpu(narrowed), w.astype(np.complex64)),
        rejected(lambda: interop.to_cpu(w, dtype="c64")),
        rejected(lambda: interop.to_cpu(z, dtype="f32")),
        tuple(interop.from_cpu(interop.to_cpu(np.zeros((0, 2), dtype=np.complex128))).shape) == (0, 2),
    ],
]
for array in (z_cpu, z_view, z_gpu, w_cpu, w_gpu, z_dst, w_dst, promoted, narrowed):
    array.destroy()
x_cpu = interop.to_cpu(np.arange(12, dtype=np.float32).reshape(3, 4))
x_view = _wasmgpu_runtime.compute.ndarray.slice(x_cpu, "1:, None")
string_slice = [list(x_view.shape), interop.from_cpu(x_view).tolist()]
x_cpu.destroy()
result = (cpu_back.tolist(), view_back.tolist(), converted.tolist(), gpu_back.tolist(), cpu_copy.tolist(), gpu_copy.tolist(), complex_checks, string_slice)
cpu.destroy()
view_cpu.destroy()
converted_cpu.destroy()
gpu.destroy()
cpu_dst.destroy()
gpu_dst.destroy()
result
`
    );
    const value = results.toJs ? results.toJs() : results.to_py ? results.to_py() : results;
    const rows = (matrix) => Array.from(matrix, (row) => Array.from(row));
    assert.deepStrictEqual(rows(value[0]), [[0, 1, 2], [3, 4, 5]]);
    assert.deepStrictEqual(rows(value[1]), [[0, 2], [3, 5]]);
    assert.deepStrictEqual(Array.from(value[2]), [0, 1, 2, 3]);
    assert.deepStrictEqual(rows(value[3]), [[0, 1, 2], [3, 4, 5]]);
    assert.deepStrictEqual(rows(value[4]), [[10, 11, 12], [13, 14, 15]]);
    assert.deepStrictEqual(rows(value[5]), [[20, 21, 22], [23, 24, 25]]);
    assert.deepStrictEqual(Array.from(value[6][0]), ["c64", "c64", "c128", "c128", "c64", "c64"], "NumPy complex64 and complex128 map to c64 and c128");
    assert.deepStrictEqual(Array.from(value[6][1]), new Array(12).fill(true), "complex round trips, copies, promotions, casting rules, and empty arrays");
    assert.deepStrictEqual([Array.from(value[7][0]), Array.from(value[7][1], (plane) => rows(plane))], [[2, 1, 4], [[[4, 5, 6, 7]], [[8, 9, 10, 11]]]], "A Python str spec crosses into slice(), where None is a new axis");
    results.destroy?.();

    pyodide.globals.set("_is_root", (array) => array.base === null);
    const checks = (await pyodide.runPythonAsync(
`
from pyodide.ffi import JsException
checks = {}
ok = lambda name, value: checks.__setitem__(name, bool(value))
same = lambda x, y: x.dtype == y.dtype and x.shape == y.shape and np.ascontiguousarray(x).tobytes() == np.ascontiguousarray(y).tobytes()
def raises(run, text):
    try: run()
    except WasmGPUInteropError as error: return text in str(error)
    return False
base = (np.arange(24, dtype=np.float32) * 1.5 - 3).reshape(4, 6)
base[0, :2] = (np.nan, -0.0)
src_cpu, src_gpu = interop.to_cpu(base), interop.to_gpu(base)
async def back(res, y, **kw):
    return interop.from_cpu(y, **kw) if res == "cpu" else await interop.from_gpu(y, **kw)
for res, to, src in (("cpu", interop.to_cpu, src_cpu), ("gpu", interop.to_gpu, src_gpu)):
    for name, x in {"F": np.asfortranarray(base), "rev": base[::-1, ::-1], "gap": base[:, ::2], "bcast": np.broadcast_to(base[1], (4, 6)), "zero_d": np.array(base[1, 1])}.items():
        for order in ("K", "preserve"):
            y = to(x, order=order)
            want = x.strides if order == "preserve" else np.array(x, order="K", copy=True).strides
            ok(f"round trip {name} {res} {order}", same((r := await back(res, y, order=order)), x) and _is_root(y) and all(d <= 1 or s == t for d, s, t in zip(x.shape, r.strides, want))); y.destroy()
    for name, out in (("C", np.zeros_like(base)), ("F", np.zeros_like(base, order="F")), ("gapped", np.ones((4, 12), np.float32)[:, ::2]), ("f64", np.zeros((4, 6)))):
        ok(f"out {name} {res}", (await back(res, src, out=out)) is out and same(out, base.astype(out.dtype)))
    with np.errstate(invalid="ignore"):
        ok(f"export dtype {res}", all([same(await back(res, src, dtype=dt, casting=casting), base.astype(dt)) for dt, casting in ((np.float16, "same_kind"), ("int64", "unsafe"), (bool, "unsafe"))]))
    for dt, target in (("uint8", "f32"), ("int16", "c64"), ("float32", "f64")):
        y = to((x := (np.arange(8) * 37 - 100).astype(dt).reshape(2, 4).T), dtype=target)
        ok(f"safe cast {dt}->{target} {res}", same((r := await back(res, y)), x.astype(r.dtype))); y.destroy()
ints, y, z = interop.to_gpu(np.arange(-3, 3, dtype=np.int32)), interop.to_cpu(np.asfortranarray(base), copy="always"), interop.to_cpu(np.arange(6, dtype=">f4"))
ok("export int32 as int64 same_kind", same(await interop.from_gpu(ints, dtype="int64", casting="same_kind"), np.arange(-3, 3, dtype=np.int64)))
ok("copy always and byte order", list(y.stridesBytes) == [4, 16] and str(z.dtype) == "f32" and same(interop.from_cpu(z), np.arange(6, dtype="<f4")))
ro = np.zeros_like(base); ro.flags.writeable = False
for name, run, text in (
    ("out read-only", lambda: interop.from_cpu(src_cpu, out=ro), "writable"),
    ("export bool safe", lambda: interop.from_gpu(src_gpu, dtype=bool), "casting='safe'"),
    ("copy never in NumPy", lambda: interop.to_cpu(np.asfortranarray(base), order="C", copy="never"), "copy='never'"),
    ("copy never in TypeScript", lambda: interop.to_gpu(np.ones((256, 512), np.float32).T, order="C", copy="never"), 'copy="never"'),
    ("complex to real", lambda: interop.to_cpu(np.arange(4, dtype=np.complex64), dtype="f32", casting="unsafe"), "x.real or x.imag"),
    ("bool needs dtype", lambda: interop.to_cpu(np.array([True])), "dtype="),
    ("JsProxy rejected", lambda: interop.to_cpu(src_cpu), "from_cpu()"),
    ("view advanced indexing", lambda: interop.view(src_cpu, np.s_[[0, 1]]), "basic indexing"),
    ("view out of bounds in TypeScript", lambda: interop.view(src_cpu, 9), "out of bounds"),
):
    ok(f"raises {name}", raises(run, text))
try: interop.to_gpu(np.ones((256, 512), np.float32).T, order="C", copy="never")
except WasmGPUInteropError as error: ok("TypeScript errors are wrapped once", isinstance(error.__cause__, JsException) and str(error).startswith("PythonInterop.toGPU()"))
dst, expected = interop.to_gpu(np.zeros((3, 4), np.float32)), np.array([[1, 1, 1, 3]] * 3, np.float32)
interop.copy_into(dst, np.arange(4, dtype=np.float32)); interop.copy_into(interop.view(dst, np.s_[:, ::2]), np.ones((3, 2), np.int16))
ok("copy_into broadcast, view, and cast", same(await interop.from_gpu(dst), expected))
pending = interop.from_gpu(dst); interop.copy_into(dst, np.full((3, 4), 9, np.float32))
ok("from_gpu snapshots when called", same(await pending, expected))
pending = interop.from_gpu(dst); dst.destroy()
ok("from_gpu survives destroying its source", same(await pending, np.full((3, 4), 9, np.float32)))
x = np.arange(24, dtype=np.float32).reshape(2, 3, 4); xc = interop.to_cpu(x)
ok("view", all(same(interop.from_cpu(interop.view(xc, index)), x[index]) for index in (np.s_[1:, None, ::-1], np.s_[..., 2], np.s_[()])))
for array in (ints, y, z, xc, src_cpu, src_gpu): array.destroy()
checks
`
    )).toJs({ dict_converter: Object.fromEntries });
    const failed = Object.entries(checks).filter(([, passed]) => passed !== true).map(([name]) => name);
    assert.deepStrictEqual([Object.keys(checks).length > 40, failed], [true, []], `Pyodide interop checks failed: ${failed.join("; ")}`);
}

// 9) Cleanup.
{
    compute.destroy();
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(1), [1])), /compute.ndarray has been destroyed/);
    await destroyTestDevice(device);
}
