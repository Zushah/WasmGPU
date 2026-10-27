/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { arraysEqualU32, createApproxHelpers, createTestRandom, destroyTestDevice, setupTest } from "./utils/helpers.js";
import * as WasmGPU from "../release/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers(1e-5);

const random = createTestRandom();

const makeRandomU32Array = (n, maxInclusive = 1024) => { const a = new Uint32Array(n); for (let i = 0; i < n; i++) a[i] = (Math.floor(random() * (maxInclusive + 1)) >>> 0); return a; };

const makeRandomF32Array = (n, min = -10, max = 10) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = min + (max - min) * random(); return a; };

const { device } = await setupTest({ initWebAssembly: WasmGPU.initWebAssembly, webgpu: true });

const { Compute, ComputeKernels, GPUndarray } = WasmGPU;
assert.ok(Compute, "Missing export: Compute");
const compute = new Compute(device, device.queue);
const kernels = compute.kernels ?? (ComputeKernels ? new ComputeKernels(device, device.queue) : null);
assert.ok(kernels, "Kernels not available. Expected compute.kernels or exported ComputeKernels.");
const nd = compute.ndarray;

const gpu = (dtype, shape, data, options = {}) => nd.fromArray(dtype, shape, data, { residency: "gpu", ...options });

const read = async (array) => { const c = nd.contiguous(array); try { return await c.buffer.readAs(array.dtype === "u32" ? Uint32Array : Float32Array); } finally { c.destroy(); } };

// 1) Kernels consume and produce GPUndarrays; obsolete raw-buffer methods are gone.
{
    for (const name of ["add", "sub", "mul", "scl", "axpy", "dot", "matmul", "sum", "min", "max", "argmin", "argmax", "scanExclusive", "histogram", "compact", "sort", "sortPairs", "luFactor", "luSolve", "scaleExtract", "scaleHistogram", "scaleRemap"]) assert.strictEqual(typeof kernels[name], "function", `Missing kernel: ${name}`);
    for (const name of ["addF32", "gemmF32", "sumF32", "copyF32", "copyU32", "radixSortKeysU32", "luFactorF32Batched"]) assert.strictEqual(kernels[name], undefined, `Obsolete kernel still present: ${name}`);
    const sum = kernels.add(gpu("f32", [3], [1, -2, 3]), gpu("f32", [3], [4, 5, -6]));
    assert.ok(sum instanceof GPUndarray, "kernels return GPUndarrays");
    assert.deepStrictEqual(sum.shape, [3], "owned output shape");
    assert.strictEqual(sum.buffer.buffer.label, "compute.kernels.add", "owned outputs default to a compute.kernels.<op> label");
    assert.ok((sum.buffer.usage & GPUBufferUsage.COPY_SRC) !== 0 && (sum.buffer.usage & GPUBufferUsage.COPY_DST) !== 0, "owned outputs default to copySrc and copyDst");
    arraysApproxEqual(await read(sum), new Float32Array([5, 3, -3]), 1e-6, "add");
}

// 2) Elementwise f32/u32 arithmetic with NumPy broadcasting.
{
    const af = gpu("f32", [3], [1, -2, 3]), bf = gpu("f32", [3], [4, 5, -6]);
    arraysApproxEqual(await read(kernels.sub(af, bf)), new Float32Array([-3, -7, 9]), 1e-6, "sub f32");
    arraysApproxEqual(await read(kernels.mul(af, bf)), new Float32Array([4, -10, -18]), 1e-6, "mul f32");
    const au = gpu("u32", [3], [1, 7, 0xFFFFFFFF]), bu = gpu("u32", [3], [4, 3, 2]);
    arraysEqualU32(await read(kernels.add(au, bu)), new Uint32Array([5, 10, 1]), "add u32 wraps");
    arraysEqualU32(await read(kernels.sub(au, bu)), new Uint32Array([0xFFFFFFFD, 4, 0xFFFFFFFD]), "sub u32 wraps");
    arraysEqualU32(await read(kernels.mul(au, bu)), new Uint32Array([4, 21, 0xFFFFFFFE]), "mul u32 wraps");

    // [m, n] + [n] broadcasts the row; a 0-d operand broadcasts everywhere.
    const m = 37, n = 300;
    const matrix = makeRandomF32Array(m * n), row = makeRandomF32Array(n);
    const sum = kernels.add(gpu("f32", [m, n], matrix), gpu("f32", [n], row));
    assert.deepStrictEqual(sum.shape, [m, n], "broadcast output shape");
    arraysApproxEqual(await read(sum), matrix.map((x, i) => Math.fround(x + row[i % n])), 1e-6, "[m, n] + [n]");
    const scaled = kernels.mul(gpu("f32", [], [2.5]), gpu("f32", [2, 2], [1, 2, 3, 4]));
    arraysApproxEqual(await read(scaled), new Float32Array([2.5, 5, 7.5, 10]), 1e-6, "0-d operand");
    const outer = kernels.sub(gpu("u32", [3, 1], [10, 20, 30]), gpu("u32", [1, 2], [1, 2]));
    arraysEqualU32(await read(outer), new Uint32Array([9, 8, 19, 18, 29, 28]), "[m, 1] - [1, n]");
    assert.deepStrictEqual(kernels.add(gpu("f32", [0, 4], []), gpu("f32", [4], [1, 2, 3, 4])).shape, [0, 4], "empty broadcast output");

    // Transposed and unaligned operands are read in place through their strides.
    const t = gpu("f32", [3, 4], makeRandomF32Array(12)), tv = await read(t), base = makeRandomF32Array(13);
    const unaligned = nd.reshape(nd.slice(gpu("f32", [13], base), [[1, 13]]), [4, 3]);
    const want = new Float32Array(12);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) want[i * 3 + j] = Math.fround(tv[j * 4 + i] + base[1 + i * 3 + j]);
    arraysApproxEqual(await read(kernels.add(nd.transpose(t), unaligned)), want, 1e-6, "transposed + unaligned slice");
}

// 3) Complex arithmetic uses f32 [..., 2] pair arrays with complex: true.
{
    const ac = gpu("f32", [3, 2], [1, 2, -3, 4, 0.5, -1]), bc = gpu("f32", [3, 2], [3, -1, 2, 5, -2, 4]);
    arraysApproxEqual(await read(kernels.add(ac, bc, { complex: true })), new Float32Array([4, 1, -1, 9, -1.5, 3]), 1e-6, "add complex");
    arraysApproxEqual(await read(kernels.sub(ac, bc, { complex: true })), new Float32Array([-2, 3, -5, -1, 2.5, -5]), 1e-6, "sub complex");
    arraysApproxEqual(await read(kernels.mul(ac, bc, { complex: true })), new Float32Array([5, 5, -26, -7, 3, 4]), 1e-6, "mul complex");
    arraysApproxEqual(await read(kernels.mul(ac, bc)), new Float32Array([3, -2, -6, 20, -1, -4]), 1e-6, "without complex: true, pair arrays multiply componentwise");
    arraysApproxEqual(await read(kernels.scl(ac, [2, -1], { complex: true })), new Float32Array([4, 3, -2, 11, 0, -2.5]), 1e-6, "scl complex");
    arraysApproxEqual(await read(kernels.scl(ac, 2, { complex: true })), new Float32Array([2, 4, -6, 8, 1, -2]), 1e-6, "scl complex with a real number");
    arraysApproxEqual(await read(kernels.axpy(ac, bc, [2, -1], { complex: true })), new Float32Array([7, 2, 0, 16, -2, 1.5]), 1e-6, "axpy complex");
    const col = kernels.mul(gpu("f32", [2, 1, 2], [1, 1, 0, 2]), gpu("f32", [3, 2], [1, 0, 0, 1, 2, 2]), { complex: true });
    assert.deepStrictEqual(col.shape, [2, 3, 2], "complex broadcasting applies to logical shapes");
    arraysApproxEqual(await read(col), new Float32Array([1, 1, -1, 1, 0, 4, 0, 2, -2, 0, -4, 4]), 1e-6, "complex broadcast mul");
    assert.throws(() => kernels.mul(gpu("u32", [1, 2], [1, 2]), gpu("u32", [1, 2], [1, 2]), { complex: true }), /compute\.kernels\.mul: complex: true requires a to be an f32 array/);
    assert.throws(() => kernels.add(gpu("f32", [2, 3], new Float32Array(6)), gpu("f32", [2, 3], new Float32Array(6)), { complex: true }), /last axis of length 2/);
    assert.throws(() => kernels.scl(ac, [1, 2]), /alpha is a \[real, imaginary\] tuple, which requires complex: true/);
}

// 4) scl and axpy, including in-place axpy through out: y.
{
    const af = gpu("f32", [3], [1, -2, 3]), bf = gpu("f32", [3], [4, 5, -6]);
    arraysApproxEqual(await read(kernels.scl(af, -2)), new Float32Array([-2, 4, -6]), 1e-6, "scl f32");
    arraysApproxEqual(await read(kernels.axpy(af, bf, 2)), new Float32Array([6, 1, 0]), 1e-6, "axpy f32");
    const au = gpu("u32", [3], [1, 7, 0xFFFFFFFF]), bu = gpu("u32", [3], [4, 3, 2]);
    arraysEqualU32(await read(kernels.scl(au, 3)), new Uint32Array([3, 21, 0xFFFFFFFD]), "scl u32");
    arraysEqualU32(await read(kernels.axpy(au, bu, 2)), new Uint32Array([6, 17, 0]), "axpy u32");
    assert.throws(() => kernels.scl(au, 1.5), /compute\.kernels\.scl: alpha must be a u32 integer/);

    // out may share its buffer with an input; the result goes through a temporary and is written back.
    const x = gpu("f32", [4], [1, 2, 3, 4]), y = gpu("f32", [4], [10, 20, 30, 40]);
    assert.strictEqual(kernels.axpy(x, y, 0.5, { out: y }), y, "axpy returns the caller out");
    arraysApproxEqual(await read(y), new Float32Array([10.5, 21, 31.5, 42]), 1e-6, "in-place axpy");
    const row = kernels.axpy(gpu("f32", [2, 2], [1, 2, 3, 4]), gpu("f32", [2], [100, 200]), 3);
    arraysApproxEqual(await read(row), new Float32Array([103, 206, 109, 212]), 1e-6, "axpy broadcasts y");
}

// 5) Dot products, including u32 wrap, non-conjugating complex, multipass, and empty inputs.
{
    const out = kernels.dot(gpu("f32", [3], [1.5, -2, 4]), gpu("f32", [3], [2, 3, -0.5]));
    assert.strictEqual(out.ndim, 0, "dot returns a 0-d array");
    numberApproxEqual((await read(out))[0], -5, 1e-5, "dot f32");
    assert.strictEqual((await read(kernels.dot(gpu("u32", [2], [0xFFFFFFFF, 2]), gpu("u32", [2], [2, 3]))))[0], 4, "dot u32 wrap");
    const dotc = kernels.dot(gpu("f32", [2, 2], [1, 2, 3, -1]), gpu("f32", [2, 2], [2, 1, -4, 2]), { complex: true });
    assert.deepStrictEqual(dotc.shape, [2], "complex dot returns one pair");
    arraysApproxEqual(await read(dotc), new Float32Array([-10, 15]), 1e-5, "dot complex non-conjugating");
    const many = gpu("f32", [1025], new Float32Array(1025).fill(1.25));
    numberApproxEqual((await read(kernels.dot(many, many)))[0], 1025 * 1.25 * 1.25, 1e-3, "dot multipass");
    const manyC = gpu("f32", [513, 2], new Float32Array(1026).fill(1));
    arraysApproxEqual(await read(kernels.dot(manyC, manyC, { complex: true })), new Float32Array([0, 1026]), 1e-3, "dot complex multipass");
    const stale = gpu("f32", [2], [7, 7]);
    kernels.dot(gpu("f32", [0, 2], []), gpu("f32", [0, 2], []), { complex: true, out: stale });
    arraysApproxEqual(await read(stale), new Float32Array([0, 0]), 0, "empty complex dot writes zero into out");
    assert.strictEqual((await read(kernels.dot(gpu("u32", [0], []), gpu("u32", [0], []))))[0], 0, "empty dot");
    assert.throws(() => kernels.dot(gpu("f32", [2, 2], new Float32Array(4)), gpu("f32", [2, 2], new Float32Array(4))), /compute\.kernels\.dot: a must be 1-D/);
}

// 6) Whole-array reductions over any shape and layout; min/max of empty arrays throw.
{
    const n = 10000;
    const a = makeRandomU32Array(n, 10);
    const ua = gpu("u32", [100, 100], a);
    let sum = 0, mn = 0xFFFFFFFF, mx = 0;
    for (const v of a) { sum = (sum + v) >>> 0; mn = Math.min(mn, v); mx = Math.max(mx, v); }
    assert.strictEqual((await read(kernels.sum(ua)))[0], sum, "sum u32");
    assert.strictEqual((await read(kernels.min(ua)))[0], mn, "min u32");
    assert.strictEqual((await read(kernels.max(ua)))[0], mx, "max u32");
    const ones = gpu("f32", [8192 + 37], new Float32Array(8192 + 37).fill(1));
    const out = kernels.sum(ones);
    assert.ok(out.ndim === 0 && out.dtype === "f32", "reductions return 0-d arrays of the input dtype");
    numberApproxEqual((await read(out))[0], 8192 + 37, 1e-3, "sum f32");

    // An unaligned contiguous slice and a stepped view are staged into dense temporaries first.
    const f = makeRandomF32Array(4099);
    const root = gpu("f32", [4099], f);
    const sliced = nd.slice(root, [[3, 4099]]);
    const stepped = nd.slice(root, [[4098, null, -3]]);
    let want = 0, wantMax = -Infinity;
    for (let i = 3; i < 4099; i++) want += f[i];
    for (let i = 4098; i >= 0; i -= 3) wantMax = Math.max(wantMax, f[i]);
    numberApproxEqual((await read(kernels.sum(sliced)))[0], want, 1e-2, "sum of an unaligned slice");
    assert.strictEqual((await read(kernels.max(stepped)))[0], wantMax, "max of a flipped stepped view");
    const empty = gpu("f32", [0, 3], []);
    assert.strictEqual((await read(kernels.sum(empty)))[0], 0, "empty sum is 0");
    assert.throws(() => kernels.min(empty), /compute\.kernels\.min: cannot reduce an empty array/);
    assert.throws(() => kernels.max(empty), /compute\.kernels\.max: cannot reduce an empty array/);
}

// 7) argmin/argmax skip NaN, resolve ties to the lowest C-order index, and return 0xFFFFFFFF for all-NaN input.
{
    const a = gpu("f32", [7], [3.0, -2.5, NaN, 8.0, 1.25, -2.5, 8.0]);
    const outMin = kernels.argmin(a);
    assert.ok(outMin.ndim === 0 && outMin.dtype === "u32", "arg-reductions return 0-d u32 indices");
    assert.strictEqual((await read(outMin))[0], 1, "argmin index with NaN and ties");
    assert.strictEqual((await read(kernels.argmax(a)))[0], 3, "argmax index with NaN and ties");
    assert.strictEqual((await read(kernels.argmin(gpu("f32", [3], [NaN, 4, NaN]))))[0], 1, "argmin skips leading NaN");
    for (const n of [3, 512]) assert.strictEqual((await read(kernels.argmax(gpu("f32", [n], new Float32Array(n).fill(NaN)))))[0], 0xFFFFFFFF, `all-NaN sentinel (n=${n})`);
    assert.strictEqual((await read(kernels.argmin(gpu("f32", [3], [Infinity, NaN, Infinity]))))[0], 0, "argmin of infinities");
    assert.strictEqual((await read(kernels.argmax(gpu("f32", [2], [-Infinity, -Infinity]))))[0], 0, "argmax of negative infinities");
    const n = 513 * 3;
    const values = makeRandomF32Array(n);
    values[1000] = -100;
    const big = gpu("f32", [3, 513], values);
    assert.strictEqual((await read(kernels.argmin(big)))[0], 1000, "multipass argmin");
    assert.strictEqual((await read(kernels.argmin(nd.transpose(big))))[0], (1000 % 513) * 3 + Math.floor(1000 / 513), "argmin of a transposed view");
    assert.throws(() => kernels.argmin(gpu("f32", [0], [])), /compute\.kernels\.argmin: cannot reduce an empty array/);
}

// 8) Exclusive scan around the 1,024-element block geometry.
{
    for (const n of [1, 17, 1023, 1024, 1025, 4096 + 13]) {
        const input = makeRandomU32Array(n, 7);
        const got = await read(kernels.scanExclusive(gpu("u32", [n], input)));
        const expected = new Uint32Array(n);
        for (let i = 1; i < n; i++) expected[i] = (expected[i - 1] + input[i - 1]) >>> 0;
        arraysEqualU32(got, expected, `scanExclusive n=${n}`);
    }
    assert.deepStrictEqual(kernels.scanExclusive(gpu("u32", [0], [])).shape, [0], "empty scan");
    assert.throws(() => kernels.scanExclusive(gpu("u32", [2, 2], [1, 2, 3, 4])), /compute\.kernels\.scanExclusive: a must be 1-D \(got shape \[2,2\]\); use compute\.ndarray\.reshape\(\)/);
}

// 9) Histograms, including shader clearing without COPY_DST and clear: false accumulation.
{
    const bins = 32, n = 20000;
    const keys = new Uint32Array(n);
    for (let i = 0; i < n; i++) keys[i] = (Math.floor(random() * bins) >>> 0);
    const expected = new Uint32Array(bins);
    for (let i = 0; i < n; i++) expected[keys[i]]++;
    const counts = kernels.histogram(gpu("u32", [n], keys), { bins });
    assert.deepStrictEqual(counts.shape, [bins], "histogram shape");
    arraysEqualU32(await read(counts), expected, "histogram");

    const binCount = 300;
    const fallbackKeys = gpu("u32", [7], [0, 1, 1, 255, 256, 299, 300]);
    const out = gpu("u32", [binCount], new Uint32Array(binCount).fill(99), { copyDst: false });
    kernels.histogram(fallbackKeys, { bins: binCount, out });
    kernels.histogram(fallbackKeys, { bins: binCount, out, clear: false });
    const got = await read(out);
    assert.deepStrictEqual([got[0], got[1], got[2], got[255], got[256], got[299]], [2, 4, 0, 2, 2, 2], "histogram fallback clear and accumulation");
    assert.throws(() => kernels.histogram(fallbackKeys, { bins: 1.5 }), /compute\.kernels\.histogram: bins must be an integer >= 0/);
}

// 10) Compaction keeps the count on the GPU as a 0-d u32 array.
{
    for (const [dtype, n] of [["u32", 4096 + 17], ["f32", 2048 + 9]]) {
        const input = dtype === "u32" ? makeRandomU32Array(n, 1000) : makeRandomF32Array(n, -5, 5);
        const flags = new Uint32Array(n);
        for (let i = 0; i < n; i++) flags[i] = (random() < 0.4) ? 1 : 0;
        const { values, count } = kernels.compact(gpu(dtype, [n], input), gpu("u32", [n], flags));
        assert.ok(count instanceof GPUndarray && count.ndim === 0 && count.dtype === "u32", "compact count is a 0-d u32 GPUndarray");
        assert.deepStrictEqual(values.shape, [n], "compact values keep the input capacity");
        const expected = Array.from(input).filter((_, i) => flags[i] !== 0);
        assert.strictEqual(await compute.readback.readScalarU32(count.buffer), expected.length, `compact ${dtype} count`);
        arraysApproxEqual((await read(values)).subarray(0, expected.length), expected, 0, `compact ${dtype} values`);
    }
    const result = kernels.compact(gpu("u32", [3], [10, 20, 30]), gpu("u32", [3], [2, 0, 3]));
    assert.strictEqual((await read(result.count))[0], 5, "arbitrary flag count");
    const out = await read(result.values);
    assert.deepStrictEqual([out[0], out[2]], [10, 30], "arbitrary flag scatter");
    assert.throws(() => kernels.compact(gpu("f32", [3], [1, 2, 3]), gpu("u32", [2], [1, 0])), /values and flags must have the same length/);
}

// 11) Radix sorts of keys and stable key-value pairs, in place through the outputs.
{
    const n = 10000 + 3;
    const keys = makeRandomU32Array(n, 0xFFFFFFFF);
    const expected = Array.from(keys).sort((a, b) => a - b);
    arraysEqualU32(await read(kernels.sort(gpu("u32", [n], keys))), Uint32Array.from(expected), "sort");
    const inPlace = gpu("u32", [n], keys);
    assert.strictEqual(kernels.sort(inPlace, { out: inPlace }), inPlace, "sort in place returns keys");
    arraysEqualU32(await read(inPlace), Uint32Array.from(expected), "sort in place");

    const pairs = kernels.sortPairs(gpu("u32", [8], [5, 1, 5, 3, 1, 0, 5, 3]), gpu("f32", [8], [50, 10, 51, 30, 11, 0, 52, 31]));
    arraysEqualU32(await read(pairs.keys), new Uint32Array([0, 1, 1, 3, 3, 5, 5, 5]), "sortPairs keys");
    arraysApproxEqual(await read(pairs.values), new Float32Array([0, 10, 11, 30, 31, 50, 51, 52]), 0, "sortPairs f32 values move bitwise and stably");
    const k = gpu("u32", [6], [7, 4, 9, 4, 8, 2]), v = gpu("u32", [6], [70, 40, 90, 41, 80, 20]);
    const result = kernels.sortPairs(k, v, { outKeys: k, outValues: v });
    assert.ok(result.keys === k && result.values === v, "sortPairs in place returns the inputs");
    arraysEqualU32(await read(k), new Uint32Array([2, 4, 4, 7, 8, 9]), "sortPairs in place keys");
    arraysEqualU32(await read(v), new Uint32Array([20, 40, 41, 70, 80, 90]), "sortPairs in place values");

    const m = 4099;
    const dup = Uint32Array.from({ length: m }, (_, i) => Math.imul(i, 17) & 31);
    const stable = kernels.sortPairs(gpu("u32", [m], dup), gpu("u32", [m], Uint32Array.from({ length: m }, (_, i) => i)));
    const order = Array.from({ length: m }, (_, i) => i).sort((a, b) => (dup[a] - dup[b]) || (a - b));
    arraysEqualU32(await read(stable.values), Uint32Array.from(order), "sortPairs stability across blocks");
    const shared = gpu("u32", [8], new Uint32Array(8));
    assert.throws(() => kernels.sortPairs(k, v, { outKeys: nd.slice(shared, [[0, 6]]), outValues: nd.slice(shared, [[2, 8]]) }), /outKeys and outValues must not overlap/);
}

const luFactorCPUPivoted = (aFlat, n) => {
    const A = Float32Array.from(aFlat);
    const ipiv = new Uint32Array(n);
    for (let k = 0; k < n; k++) {
        let piv = k;
        let maxv = Math.abs(A[k * n + k]);
        for (let i = k + 1; i < n; i++) {
            const v = Math.abs(A[i * n + k]);
            if (v > maxv || (v === maxv && i < piv)) {
                maxv = v;
                piv = i;
            }
        }
        ipiv[k] = piv >>> 0;
        if (piv !== k) {
            for (let j = 0; j < n; j++) {
                const t = A[k * n + j];
                A[k * n + j] = A[piv * n + j];
                A[piv * n + j] = t;
            }
        }
        const dia = A[k * n + k];
        for (let i = k + 1; i < n; i++) A[i * n + k] /= dia;
        for (let i = k + 1; i < n; i++) {
            const lik = A[i * n + k];
            for (let j = k + 1; j < n; j++) A[i * n + j] -= lik * A[k * n + j];
        }
    }
    return { A, ipiv };
};

const cxMul = (ar, ai, br, bi) => [ar * br - ai * bi, ar * bi + ai * br];

const luFactorCPUPivotedComplex = (aFlat2, n) => {
    const A = Float32Array.from(aFlat2);
    const ipiv = new Uint32Array(n);
    for (let k = 0; k < n; k++) {
        let piv = k;
        let maxv = -1;
        for (let i = k; i < n; i++) {
            const t = (i * n + k) * 2;
            const ms = A[t] * A[t] + A[t + 1] * A[t + 1];
            if (ms > maxv || (ms === maxv && i < piv)) {
                maxv = ms;
                piv = i;
            }
        }
        ipiv[k] = piv >>> 0;
        if (piv !== k) {
            for (let j = 0; j < 2 * n; j++) {
                const t = A[2 * k * n + j];
                A[2 * k * n + j] = A[2 * piv * n + j];
                A[2 * piv * n + j] = t;
            }
        }
        const pk = (k * n + k) * 2;
        const d = A[pk] * A[pk] + A[pk + 1] * A[pk + 1];
        for (let i = k + 1; i < n; i++) {
            const t = (i * n + k) * 2;
            const re = (A[t] * A[pk] + A[t + 1] * A[pk + 1]) / d;
            const im = (A[t + 1] * A[pk] - A[t] * A[pk + 1]) / d;
            A[t] = re;
            A[t + 1] = im;
        }
        for (let i = k + 1; i < n; i++) {
            const lr = A[(i * n + k) * 2], li = A[(i * n + k) * 2 + 1];
            for (let j = k + 1; j < n; j++) {
                const [mr, mi] = cxMul(lr, li, A[(k * n + j) * 2], A[(k * n + j) * 2 + 1]);
                A[(i * n + j) * 2] -= mr;
                A[(i * n + j) * 2 + 1] -= mi;
            }
        }
    }
    return { A, ipiv };
};

const luResidual = (a, x, b, batch, n, complex) => {
    let worst = 0;
    for (let k = 0; k < batch; k++) {
        let bMax = 0, resMax = 0;
        for (let i = 0; i < n; i++) {
            let re = 0, im = 0;
            for (let j = 0; j < n; j++) {
                if (complex) {
                    const t = (k * n * n + i * n + j) * 2, s = (k * n + j) * 2;
                    const [mr, mi] = cxMul(a[t], a[t + 1], x[s], x[s + 1]);
                    re += mr;
                    im += mi;
                } else re += a[k * n * n + i * n + j] * x[k * n + j];
            }
            const r = (k * n + i) * (complex ? 2 : 1);
            resMax = Math.max(resMax, complex ? Math.hypot(re - b[r], im - b[r + 1]) : Math.abs(re - b[r]));
            bMax = Math.max(bMax, complex ? Math.hypot(b[r], b[r + 1]) : Math.abs(b[r]));
        }
        worst = Math.max(worst, resMax / Math.max(bMax, 1e-30));
    }
    return worst;
};

// 12) Batched LU factor and solve (partial pivoting; ipiv holds 0-based row indices) for f32 and complex.
{
    const batch = 3, n = 4;
    const a = new Float32Array(batch * n * n), rhs = new Float32Array(batch * n);
    const ac = new Float32Array(batch * n * n * 2), rhsc = new Float32Array(batch * n * 2);
    for (let b = 0; b < batch; b++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const t = b * n * n + i * n + j;
                a[t] = (i === j) ? (4 + b + i) : (0.1 * (i + 1) - 0.07 * (j + 1) + 0.02 * b);
                ac[2 * t] = a[t];
                ac[2 * t + 1] = (i === j) ? 0.15 : (0.05 * (i - j) + 0.01 * b);
            }
            rhs[b * n + i] = 0.5 + 0.1 * i + 0.03 * b;
            rhsc[2 * (b * n + i)] = rhs[b * n + i];
            rhsc[2 * (b * n + i) + 1] = 0.2 - 0.05 * i + 0.02 * b;
        }
    }
    for (const complex of [false, true]) {
        const w = complex ? 2 : 1, data = complex ? ac : a, b = complex ? rhsc : rhs;
        const input = gpu("f32", complex ? [batch, n, n, 2] : [batch, n, n], data);
        const { lu, ipiv } = kernels.luFactor(input, { complex });
        assert.deepStrictEqual(ipiv.shape, [batch, n], "ipiv shape");
        arraysApproxEqual(await read(input), data, 0, "luFactor leaves a untouched without overwrite");
        const gotLu = await read(lu), gotIpiv = await read(ipiv);
        for (let k = 0; k < batch; k++) {
            const slice = data.subarray(k * n * n * w, (k + 1) * n * n * w);
            const want = complex ? luFactorCPUPivotedComplex(slice, n) : luFactorCPUPivoted(slice, n);
            arraysApproxEqual(gotLu.subarray(k * n * n * w, (k + 1) * n * n * w), want.A, 5e-4, `LU factor ${complex ? "complex" : "f32"} batch ${k}`);
            arraysEqualU32(gotIpiv.subarray(k * n, (k + 1) * n), want.ipiv, `ipiv ${complex ? "complex" : "f32"} batch ${k}`);
        }
        const x = kernels.luSolve(lu, ipiv, gpu("f32", complex ? [batch, n, 2] : [batch, n], b), { complex });
        assert.ok(luResidual(data, await read(x), b, batch, n, complex) < 3e-3, `LU solve residual ${complex ? "complex" : "f32"}`);

        const stored = new Float32Array(data.length);
        for (let t = 0; t < batch * n * n; t++) { const k = Math.floor(t / (n * n)), i = Math.floor(t / n) % n, j = t % n; for (let c = 0; c < w; c++) stored[(k * n * n + j * n + i) * w + c] = data[t * w + c]; }
        const view = nd.swapAxes(gpu("f32", complex ? [batch, n, n, 2] : [batch, n, n], stored), 1, 2);
        const factored = kernels.luFactor(view, { overwrite: true, complex });
        assert.strictEqual(factored.lu, view, "overwrite returns a");
        arraysApproxEqual(await read(view), gotLu, 1e-6, `overwrite through a transposed view ${complex ? "complex" : "f32"}`);
        arraysEqualU32(await read(factored.ipiv), gotIpiv, "overwrite ipiv");
    }
    assert.throws(() => kernels.luFactor(gpu("f32", [2, 3], new Float32Array(6))), /compute\.kernels\.luFactor: a must hold square matrices/);
    assert.throws(() => kernels.luSolve(gpu("f32", [2, 2], [1, 0, 0, 1]), gpu("u32", [2], [0, 1]), gpu("f32", [3, 2], new Float32Array(6))), /batch dimensions are not broadcast/);
}

// 13) LU solve fallback for n > 512 and the blocked factorization at n >= 160.
{
    const n = 513;
    for (const complex of [false, true]) {
        const w = complex ? 2 : 1;
        const lu = new Float32Array(n * n * w), rhs = new Float32Array(n * w);
        for (let i = 0; i < n; i++) { lu[(i * n + i) * w] = 1; rhs[i * w] = Math.sin(i * 0.17); if (complex) rhs[2 * i + 1] = Math.cos(i * 0.11); }
        const ipiv = gpu("u32", [n], Uint32Array.from({ length: n }, (_, i) => i));
        const x = kernels.luSolve(gpu("f32", complex ? [n, n, 2] : [n, n], lu), ipiv, gpu("f32", complex ? [n, 2] : [n], rhs), { complex });
        arraysApproxEqual(await read(x), rhs, 1e-5, `LU ${complex ? "complex" : "f32"} large solve`);
    }
    let seed = 0x9e3779b1 >>> 0;
    const rand = () => {
        seed = ((seed + 0x6D2B79F5) >>> 0);
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
    };
    const m = 192, batch = 2;
    for (const complex of [false, true]) {
        const w = complex ? 2 : 1;
        const a = new Float32Array(batch * m * m * w), rhs = new Float32Array(batch * m * w);
        for (let b = 0; b < batch; b++) {
            for (let i = 0; i < m; i++) {
                let rowMag = 0;
                for (let j = 0; j < m * w; j++) { const v = (rand() - 0.5) / m; a[(b * m * m + i * m) * w + j] = v; rowMag += Math.abs(v); }
                a[(b * m * m + i * m + i) * w] = rowMag + 1 + b * 0.25;
                for (let c = 0; c < w; c++) rhs[(b * m + i) * w + c] = rand();
            }
        }
        const { lu, ipiv } = kernels.luFactor(gpu("f32", complex ? [batch, m, m, 2] : [batch, m, m], a), { complex });
        const x = kernels.luSolve(lu, ipiv, gpu("f32", complex ? [batch, m, 2] : [batch, m], rhs), { complex });
        assert.ok(luResidual(a, await read(x), rhs, batch, m, complex) < 1e-3, `${complex ? "complex" : "f32"} blocked LU residual`);
    }
}

// 14) matmul with alpha/beta, k = 0, rectangular products, native strides, and NumPy 1-D promotion.
{
    const af = gpu("f32", [2, 3], [1, 2, 3, 4, 5, 6]), bf = gpu("f32", [3, 2], [1, 2, 3, 4, 5, 6]);
    const cf = gpu("f32", [2, 2], [1, 1, 1, 1]);
    assert.strictEqual(kernels.matmul(af, bf, { out: cf, alpha: 2, beta: 3 }), cf, "matmul returns out");
    arraysApproxEqual(await read(cf), new Float32Array([47, 59, 101, 131]), 1e-5, "matmul f32 alpha/beta");
    const c0 = gpu("f32", [1, 2], [2, -3]);
    kernels.matmul(gpu("f32", [1, 0], []), gpu("f32", [0, 2], []), { out: c0, beta: -2 });
    arraysApproxEqual(await read(c0), new Float32Array([-4, 6]), 1e-6, "matmul f32 k=0");
    const cu = gpu("u32", [2, 2], [1, 1, 1, 1]);
    kernels.matmul(gpu("u32", [2, 3], [1, 2, 3, 4, 5, 6]), gpu("u32", [3, 2], [1, 2, 3, 4, 5, 6]), { out: cu, alpha: 2, beta: 3 });
    arraysEqualU32(await read(cu), new Uint32Array([47, 59, 101, 131]), "matmul u32 alpha/beta");
    const cc = gpu("f32", [1, 1, 2], [2, -1]);
    kernels.matmul(gpu("f32", [1, 2, 2], [1, 1, 2, -1]), gpu("f32", [2, 1, 2], [3, 2, -1, 4]), { complex: true, out: cc, alpha: [2, -1], beta: [-1, 0.5] });
    arraysApproxEqual(await read(cc), new Float32Array([18.5, 27]), 1e-5, "matmul complex alpha/beta");
    assert.throws(() => kernels.matmul(af, bf, { beta: 1 }), /compute\.kernels\.matmul: beta != 0 requires out/);

    // A rectangular, non-tile-aligned product for every dtype.
    const rectA = new Float32Array(3 * 5), rectB = new Float32Array(5 * 7);
    for (let i = 0; i < rectA.length; i++) rectA[i] = (i % 5) - 2;
    for (let i = 0; i < rectB.length; i++) rectB[i] = (i % 7) * 0.25 - 0.5;
    const want = new Float32Array(21);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) for (let q = 0; q < 5; q++) want[i * 7 + j] += rectA[i * 5 + q] * rectB[q * 7 + j];
    arraysApproxEqual(await read(kernels.matmul(gpu("f32", [3, 5], rectA), gpu("f32", [5, 7], rectB))), want, 1e-5, "rectangular matmul f32");
    const rectAU = Uint32Array.from(rectA, (x) => (x + 2) >>> 0), rectBU = Uint32Array.from(rectB, (x) => Math.round((x + 0.5) * 4) >>> 0);
    const wantU = new Uint32Array(21);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) for (let q = 0; q < 5; q++) wantU[i * 7 + j] = (wantU[i * 7 + j] + Math.imul(rectAU[i * 5 + q], rectBU[q * 7 + j])) >>> 0;
    arraysEqualU32(await read(kernels.matmul(gpu("u32", [3, 5], rectAU), gpu("u32", [5, 7], rectBU))), wantU, "rectangular matmul u32");
    const rectAC = new Float32Array(30), rectBC = new Float32Array(70), wantC = new Float32Array(42);
    for (let i = 0; i < 15; i++) { rectAC[2 * i] = rectA[i]; rectAC[2 * i + 1] = (i % 3) - 1; }
    for (let i = 0; i < 35; i++) { rectBC[2 * i] = rectB[i]; rectBC[2 * i + 1] = (i % 2) * 0.5; }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) for (let q = 0; q < 5; q++) { const ai = 2 * (i * 5 + q), bi = 2 * (q * 7 + j), ci = 2 * (i * 7 + j); wantC[ci] += rectAC[ai] * rectBC[bi] - rectAC[ai + 1] * rectBC[bi + 1]; wantC[ci + 1] += rectAC[ai] * rectBC[bi + 1] + rectAC[ai + 1] * rectBC[bi]; }
    arraysApproxEqual(await read(kernels.matmul(gpu("f32", [3, 5, 2], rectAC), gpu("f32", [5, 7, 2], rectBC), { complex: true })), wantC, 1e-4, "rectangular matmul complex");

    // A transposed operand is read through its strides; the result matches the CPU product of the logical views.
    const at = gpu("f32", [5, 3], Float32Array.from({ length: 15 }, (_, i) => rectA[(i % 3) * 5 + Math.floor(i / 3)]));
    arraysApproxEqual(await read(kernels.matmul(nd.transpose(at), gpu("f32", [5, 7], rectB))), want, 1e-5, "matmul of a transposed operand");

    // 1-D promotion: [k] @ [k, n] -> [n], [m, k] @ [k] -> [m], [k] @ [k] -> [].
    const v = gpu("f32", [3], [1, -1, 2]);
    const left = kernels.matmul(v, bf), right = kernels.matmul(af, v), inner = kernels.matmul(v, v);
    assert.deepStrictEqual([left.shape, right.shape, inner.shape], [[2], [2], []], "1-D promotion shapes");
    arraysApproxEqual(await read(left), new Float32Array([8, 10]), 1e-6, "[k] @ [k, n]");
    arraysApproxEqual(await read(right), new Float32Array([5, 11]), 1e-6, "[m, k] @ [k]");
    arraysApproxEqual(await read(inner), new Float32Array([6]), 1e-6, "[k] @ [k]");
    assert.throws(() => kernels.matmul(af, af), /compute\.kernels\.matmul: shapes \[2,3\] and \[2,3\] are not aligned/);
}

// 15) Scale kernels read strided sources natively.
{
    const raw = new Float32Array([9, 1, 2, NaN, 9, 3, 4, 0, 9, 5, Infinity, 1]);
    const src = nd.wrap(compute.createStorageBuffer({ data: raw }), "f32", { shape: [3, 2], stridesBytes: [16, 4], offsetBytes: 4 });
    const component = kernels.scaleExtract(src, { componentIndex: 1 });
    arraysApproxEqual(await read(component.values), new Float32Array([2, 4, 0]), 0, "scaleExtract component");
    arraysEqualU32(await read(component.flags), new Uint32Array([1, 1, 0]), "scaleExtract flags");
    const magnitude = kernels.scaleExtract(src, { valueMode: "magnitude" });
    arraysApproxEqual(await read(magnitude.values), new Float32Array([Math.hypot(1, 2), 5, 0]), 1e-6, "scaleExtract magnitude");
    arraysEqualU32(await read(magnitude.flags), new Uint32Array([1, 1, 0]), "scaleExtract magnitude flags");

    const values = gpu("f32", [6], [0, 0.5, 1, 2, 3.9, 9]);
    arraysEqualU32(await read(kernels.scaleHistogram(values, { bins: 4, minValue: 0, maxValue: 4 })), new Uint32Array([2, 1, 1, 2]), "scaleHistogram clamps into edge bins");
    const kept = gpu("u32", [2], [5, 5]);
    kernels.scaleHistogram(values, { bins: 2, minValue: 1, maxValue: 1, out: kept });
    arraysEqualU32(await read(kept), new Uint32Array([0, 0]), "scaleHistogram with an empty range only clears");
    const transform = { mode: "log", clampMode: "range", clampMin: 0.1, clampMax: 10, domainMin: 0.1, domainMax: 10, logBase: 10 };
    const remapped = kernels.scaleRemap(gpu("f32", [2, 2], [0.1, 1, 10, 100]), { transform });
    assert.deepStrictEqual(remapped.shape, [2, 2], "scaleRemap keeps the input shape");
    arraysApproxEqual(await read(remapped), new Float32Array([0, 0.5, 1, 1]), 1e-5, "scaleRemap log");
}

// 16) Inputs must be live f32/u32 GPUndarrays on this device; kernels never promote or transfer.
{
    const a = gpu("f32", [2], [1, 2]);
    assert.throws(() => kernels.add(a, gpu("u32", [2], [1, 2])), /compute\.kernels\.add: a and b must have the same dtype \(got f32 and u32\); kernels never promote/);
    assert.throws(() => kernels.sum(gpu("i32", [2], [1, 2])), /compute\.kernels\.sum: a has dtype i32, but compute\.kernels\.sum supports f32 and u32; convert it with compute\.ndarray\.cast\(\) first/);
    assert.throws(() => kernels.sum(gpu("f64", [2], [1, 2])), /a has dtype f64/);
    const cpu = nd.fromArray("f32", [2], [1, 2]);
    assert.throws(() => kernels.sum(cpu), /compute\.kernels\.sum: a must be a GPUndarray; use compute\.ndarray\.toGPU\(\) first/);
    cpu.destroy();
    assert.throws(() => kernels.add(a, a, { out: gpu("f32", [3], [0, 0, 0]) }), /compute\.kernels\.add: out must have shape \[2\]/);
    assert.throws(() => kernels.add(a, a, { out: nd.slice(gpu("f32", [4], [0, 0, 0, 0]), [[0, 4, 2]]) }), /compute\.kernels\.add: out must be C-contiguous/);
    assert.throws(() => kernels.add(a, a, { out: gpu("f32", [2], [0, 0]), usage: GPUBufferUsage.VERTEX }), /copySrc, copyDst, and usage apply only to newly created outputs/);
    const dead = gpu("f32", [2], [1, 2]);
    dead.destroy();
    assert.throws(() => kernels.sum(dead), /destroyed/);
}

// 17) Kernel parameters and temporaries stay isolated across caller encoders and self-submitted calls.
{
    const a = gpu("f32", [4], [1, 2, 3, 4]);
    const b = gpu("f32", [4], [10, 20, 30, 40]);
    const c = gpu("f32", [4], [100, 200, 300, 400]);
    const pending = device.createCommandEncoder();
    const sa = kernels.scl(a, 2, { encoder: pending });
    const sb = kernels.scl(b, 5);
    const sc = kernels.scl(c, 3, { encoder: pending });
    device.queue.submit([pending.finish()]);
    assert.deepStrictEqual(Array.from(await read(sa)), [2, 4, 6, 8], "encoder parameters survive an intervening self-submitted call");
    assert.deepStrictEqual(Array.from(await read(sb)), [50, 100, 150, 200], "intervening self-submitted scalar");
    assert.deepStrictEqual(Array.from(await read(sc)), [300, 600, 900, 1200], "second encoder scalar");

    // Several kernels and staged inputs recorded into one caller encoder, interleaved with compute.ndarray calls.
    const encoder = device.createCommandEncoder();
    const m = gpu("f32", [4, 4], Float32Array.from({ length: 16 }, (_, i) => i));
    const product = kernels.matmul(nd.transpose(m), m, { encoder });
    const flat = nd.contiguous(nd.flip(product), { encoder });
    const total = kernels.sum(nd.slice(nd.reshape(flat, [16]), [[1, 16, 2]]), { encoder });
    const order = kernels.argmax(nd.reshape(flat, [16]), { encoder });
    const sorted = kernels.sort(kernels.scanExclusive(gpu("u32", [5], [3, 1, 4, 1, 5]), { encoder }), { encoder });
    device.queue.submit([encoder.finish()]);
    const want = new Float32Array(16);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let q = 0; q < 4; q++) want[i * 4 + j] += (q * 4 + i) * (q * 4 + j);
    const flipped = Array.from(want).reverse();
    arraysApproxEqual(await read(product), want, 1e-4, "encoder matmul of a transposed view");
    numberApproxEqual((await read(total))[0], flipped.filter((_, i) => i % 2 === 1).reduce((s, x) => s + x, 0), 1e-2, "encoder sum of a stepped slice");
    assert.strictEqual((await read(order))[0], 0, "encoder argmax");
    arraysEqualU32(await read(sorted), new Uint32Array([0, 3, 4, 8, 9]), "encoder scan then sort");

    const empty = gpu("f32", [0], []);
    for (const [label, run, bits] of [
        ["sum", (out, enc) => kernels.sum(empty, { out, encoder: enc }), [0]],
        ["dot", (out, enc) => kernels.dot(empty, empty, { out, encoder: enc }), [0]]
    ]) {
        const out = gpu("f32", [], [7]);
        const enc = device.createCommandEncoder();
        kernels.scl(gpu("f32", [], [3]), 2, { out, encoder: enc });
        run(out, enc);
        device.queue.submit([enc.finish()]);
        arraysEqualU32(new Uint32Array((await read(out)).buffer), new Uint32Array(bits), `${label} identity must follow earlier encoder commands`);
    }

    const n = 160;
    const lu = new Float32Array(n * n);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) lu[i * n + j] = (i === j ? n : 0) + ((i * 7 + j * 13) % 17) / 17 - 0.5;
    const rhs = gpu("f32", [n], makeRandomF32Array(n, -1, 1));
    const solveLU = async (opts) => {
        const factored = kernels.luFactor(gpu("f32", [n, n], lu), opts);
        const x = kernels.luSolve(factored.lu, factored.ipiv, rhs, opts);
        if (opts.encoder) device.queue.submit([opts.encoder.finish()]);
        return [new Uint32Array((await read(factored.lu)).buffer), new Uint32Array((await read(x)).buffer)];
    };
    const [selfLU, selfX] = await solveLU({});
    const [encLU, encX] = await solveLU({ encoder: device.createCommandEncoder() });
    arraysEqualU32(encLU, selfLU, "encoder blocked LU factors must match self-submitted factors");
    arraysEqualU32(encX, selfX, "encoder blocked LU solution must match self-submitted solution");

    const many = gpu("f32", [1025], new Float32Array(1025).fill(1));
    const sclOut = gpu("f32", [4], [0, 0, 0, 0]);
    const dotOut = gpu("f32", [], [0]);
    const calls = 64;
    const createBuffer = device.createBuffer;
    let created = 0;
    const countCreated = (run) => { created = 0; device.createBuffer = function (descriptor) { created++; return createBuffer.call(this, descriptor); }; try { run(); } finally { device.createBuffer = createBuffer; } return created; };
    kernels.scl(a, 2, { out: sclOut });
    assert.strictEqual(countCreated(() => { for (let i = 0; i < calls; i++) kernels.scl(a, i, { out: sclOut }); }), 0, "self-submitted calls must reuse their parameter block");
    const dotEncoder = device.createCommandEncoder();
    kernels.dot(many, many, { out: dotOut, encoder: dotEncoder });
    assert.strictEqual(countCreated(() => { for (let i = 0; i < calls; i++) kernels.dot(many, many, { out: dotOut, encoder: dotEncoder }); }), 0, "encoder-only calls must reuse pooled temporaries");
    device.queue.submit([dotEncoder.finish()]);
    numberApproxEqual((await read(dotOut))[0], 1025, 1e-3, "encoder-only dot");
    const alignment = Math.max(device.limits.minStorageBufferOffsetAlignment, device.limits.minUniformBufferOffsetAlignment);
    let blocks = 0;
    for (let regions = 0, size = 4096; regions < calls; size = Math.min(2 * size, 65536)) { regions += Math.floor(size / alignment); blocks++; }
    const sclEncoder = device.createCommandEncoder();
    const encoderBlocks = countCreated(() => { for (let i = 0; i < calls; i++) kernels.scl(a, i, { out: sclOut, encoder: sclEncoder }); });
    assert.ok(encoderBlocks >= 1 && encoderBlocks <= blocks, `encoder parameters must use at most ${blocks} blocks for ${calls} calls (got ${encoderBlocks})`);
    device.queue.submit([sclEncoder.finish()]);
    assert.deepStrictEqual(Array.from(await read(sclOut)), [calls - 1, 2 * (calls - 1), 3 * (calls - 1), 4 * (calls - 1)], "last encoder scalar wins");
}

// 18) Cleanup releases the shared compute context before its browser GPU device.
{
    compute.destroy();
    await destroyTestDevice(device);
}
