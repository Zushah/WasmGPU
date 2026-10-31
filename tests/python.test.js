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

// 2) Scalars, empty dimensions, multidimensional shapes, offsets, and explicit strides are supported.
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

    const readonlyGPU = python.toGPU(bufferOf(new Float32Array([1, 2]), [2], { readonly: true }), { label: "python:readonly", usage: GPUBufferUsage.VERTEX });
    try {
        assert.strictEqual(readonlyGPU.buffer.label, "python:readonly");
        assert.ok((readonlyGPU.buffer.usage & GPUBufferUsage.STORAGE) !== 0);
        assert.ok((readonlyGPU.buffer.usage & GPUBufferUsage.COPY_SRC) !== 0);
        assert.ok((readonlyGPU.buffer.usage & GPUBufferUsage.COPY_DST) !== 0);
        assert.ok((readonlyGPU.buffer.usage & GPUBufferUsage.VERTEX) !== 0);
    } finally { readonlyGPU.destroy(); }
}

// 3) Invalid layouts, metadata, shapes, ranges, and typed views fail clearly.
{
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(4), [2, 2], { c_contiguous: false })), /C-contiguous/i);
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(4), [2, 2], { strides: [1, 2] })), /C-contiguous/i);
    assert.throws(() => python.toCPU(bufferOf(new Float32Array(4), [2, 2], { strides: [-2, 1] })), /C-contiguous/i);
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
    assert.throws(() => python.toCPU(raw("Zd", 16, { offset: 4 })), /not aligned/);
    assert.throws(() => python.toCPU({ data: new DataView(new ArrayBuffer(4)), shape: [1], strides: [1], offset: 0 }), /DataView/i);
    assert.throws(() => python.toCPU(new Float32Array([1])), /Pyodide|PyBufferLike/i);
}

// 4) In-place copies preserve destination identity and allocation while enforcing exact layout/type/shape.
{
    const cpu = CPUndarray.zeros("f32", { shape: [2, 2] });
    const cpuPtr = cpu.basePtrBytes;
    python.copyInto(cpu, bufferOf(new Float32Array([1, 2, 3, 4]), [2, 2]));
    assert.strictEqual(cpu.basePtrBytes, cpuPtr);
    assert.deepStrictEqual(Array.from(cpu.data()), [1, 2, 3, 4]);
    assert.throws(() => python.copyInto(cpu, bufferOf(new Float32Array(4), [4])), /shape mismatch/i);
    assert.throws(() => python.copyInto(cpu, bufferOf(new Int32Array(4), [2, 2])), /dtype mismatch/i);
    assert.deepStrictEqual(Array.from(cpu.data()), [1, 2, 3, 4], "failed validation must not mutate the destination");

    const noncontiguousCPU = CPUndarray.empty("f32", { shape: [2, 2], stridesBytes: [16, 4] });
    assert.throws(() => python.copyInto(noncontiguousCPU, bufferOf(new Float32Array(4), [2, 2])), /destination must be C-contiguous/i);
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
    assert.throws(() => python.copyInto(noCopyDst, bufferOf(new Float32Array([1]), [1])), /COPY_DST/i);
    noCopyDst.destroy();

    const noncontiguousGPU = GPUndarray.empty(compute, "f32", { shape: [2, 2], stridesBytes: [16, 4] });
    assert.throws(() => python.copyInto(noncontiguousGPU, bufferOf(new Float32Array(4), [2, 2])), /destination must be C-contiguous/i);
    noncontiguousGPU.destroy();

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
}

// 5) Acquired buffers release exactly once; borrowed buffers never release.
{
    let borrowedReleases = 0;
    const borrowed = bufferOf(new Float32Array([1]), [1], { release: () => borrowedReleases++ });
    python.toCPU(borrowed).destroy();
    assert.throws(() => python.toCPU({ ...borrowed, c_contiguous: false }), /C-contiguous/i);
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
    runAcquired(bufferOf(new Float32Array([1]), [1]), (src) => assert.throws(() => python.copyInto(dst, src)));
    dst.destroy();

    const originalEmpty = CPUndarray.empty;
    let partialDestroyed = 0;
    CPUndarray.empty = (...args) => {
        const result = originalEmpty(...args);
        result.data = () => { throw new Error("injected CPU copy failure"); };
        const destroy = result.destroy.bind(result);
        result.destroy = () => { partialDestroyed++; destroy(); };
        return result;
    };
    try {
        runAcquired(bufferOf(new Float32Array([1]), [1]), (src) => assert.throws(() => python.toCPU(src), /injected/));
        assert.strictEqual(partialDestroyed, 1);
    } finally { CPUndarray.empty = originalEmpty; }

    const originalCreateBuffer = device.createBuffer;
    device.createBuffer = () => { throw new Error("injected GPU allocation failure"); };
    try {
        runAcquired(bufferOf(new Float32Array([1]), [1]), (src) => assert.throws(() => python.toGPU(src), /injected GPU/));
    } finally { device.createBuffer = originalCreateBuffer; }

    const noCopyDst = GPUndarray.empty(compute, "f32", { shape: [1] }, { copyDst: false });
    try {
        runAcquired(bufferOf(new Float32Array([1]), [1]), (src) => assert.throws(() => python.copyInto(noCopyDst, src), /COPY_DST/));
    } finally { noCopyDst.destroy(); }

    let originalErrorReleases = 0;
    const invalid = { getBuffer: () => bufferOf(new Float32Array([1]), [1], { c_contiguous: false, release() { originalErrorReleases++; throw new Error("release failure"); } }) };
    assert.throws(() => python.toCPU(invalid), /C-contiguous/i);
    assert.strictEqual(originalErrorReleases, 1);
}

// 6) Real Pyodide + NumPy validates metadata, normalization, conversion, and canonical round trips.
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
result = (cpu_back.tolist(), view_back.tolist(), converted.tolist(), gpu_back.tolist(), cpu_copy.tolist(), gpu_copy.tolist(), complex_checks)
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
    results.destroy?.();
}

// 7) Cleanup.
{
    compute.destroy();
    await destroyTestDevice(device);
}
