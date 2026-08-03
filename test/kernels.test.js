/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { arraysEqualU32, createApproxHelpers, createTestRandom, destroyTestDevice, setupTest } from "./utils/helpers.js";
import * as WasmGPU from "../dist/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers(1e-5);

const random = createTestRandom();

const makeRandomU32Array = (n, maxInclusive = 1024) => { const a = new Uint32Array(n); for (let i = 0; i < n; i++) a[i] = (Math.floor(random() * (maxInclusive + 1)) >>> 0); return a; };

const makeRandomF32Array = (n, min = -10, max = 10) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = min + (max - min) * random(); return a; };

const { device } = await setupTest({ webgpu: true });

const { Compute, ComputeKernels } = WasmGPU;
assert.ok(Compute, "Missing export: Compute");
const compute = new Compute(device, device.queue);
const kernels = compute.kernels ?? (ComputeKernels ? new ComputeKernels(device, device.queue) : null);
assert.ok(kernels, "Kernels not available. Expected compute.kernels or exported ComputeKernels.");

// 1) Copy kernels u32 / f32.
{
    assert.strictEqual(typeof kernels.copyU32, "function", "Missing kernel: copyU32");
    assert.strictEqual(typeof kernels.copyF32, "function", "Missing kernel: copyF32");

    // copyU32 (full)
    {
        const n = 8192 + 17;
        const a = makeRandomU32Array(n, 0xFFFFFFFF >>> 0);
        const bufA = compute.createStorageBuffer({ label: "copy:u32:in", data: a, copySrc: false });
        const out = compute.createStorageBuffer({ label: "copy:u32:out", byteLength: n * 4, copySrc: true });
        const outRef = kernels.copyU32(bufA, { out, count: n }) ?? out;
        const got = await outRef.readAs(Uint32Array);
        arraysEqualU32(got, a, "copyU32 mismatch");
    }

    // copyU32 (partial count)
    {
        const n = 4096 + 9;
        const a = makeRandomU32Array(n, 1000);
        const bufA = compute.createStorageBuffer({ label: "copy:u32:in_partial", data: a, copySrc: false });
        const m = 1024 + 3;
        const out = compute.createStorageBuffer({ label: "copy:u32:out_partial", byteLength: m * 4, copySrc: true });
        const outRef = kernels.copyU32(bufA, { out, count: m }) ?? out;
        const got = await outRef.readAs(Uint32Array);
        arraysEqualU32(got, a.subarray(0, m), "copyU32 partial mismatch");
    }

    // copyF32 (full)
    {
        const n = 8192 + 7;
        const a = makeRandomF32Array(n, -50, 50);
        const bufA = compute.createStorageBuffer({ label: "copy:f32:in", data: a, copySrc: false });
        const out = compute.createStorageBuffer({ label: "copy:f32:out", byteLength: n * 4, copySrc: true });
        const outRef = kernels.copyF32(bufA, { out, count: n }) ?? out;
        const got = await outRef.readAs(Float32Array);
        arraysApproxEqual(got, a, 1e-5, "copyF32 mismatch");
    }

    // copyF32 (partial count)
    {
        const n = 4096 + 11;
        const a = makeRandomF32Array(n, -5, 5);
        const bufA = compute.createStorageBuffer({ label: "copy:f32:in_partial", data: a, copySrc: false });
        const m = 777;
        const out = compute.createStorageBuffer({ label: "copy:f32:out_partial", byteLength: m * 4, copySrc: true });
        const outRef = kernels.copyF32(bufA, { out, count: m }) ?? out;
        const got = await outRef.readAs(Float32Array);
        arraysApproxEqual(got, a.subarray(0, m), 1e-5, "copyF32 partial mismatch");
    }
}

// 2) Reduction kernels u32.
{
    const n = 10000;
    const a = makeRandomU32Array(n, 10);
    const bufA = compute.createStorageBuffer({ label: "reduce:u32:in", data: a, copySrc: false });
    const outSum = kernels.sumU32(bufA);
    const outMin = kernels.minU32(bufA);
    const outMax = kernels.maxU32(bufA);
    let sum = 0 >>> 0;
    let mn = 0xFFFFFFFF >>> 0;
    let mx = 0 >>> 0;
    for (let i = 0; i < a.length; i++) {
        sum = (sum + (a[i] >>> 0)) >>> 0;
        mn = Math.min(mn, a[i] >>> 0) >>> 0;
        mx = Math.max(mx, a[i] >>> 0) >>> 0;
    }
    const gotSum = (await outSum.readAs(Uint32Array))[0] >>> 0;
    const gotMin = (await outMin.readAs(Uint32Array))[0] >>> 0;
    const gotMax = (await outMax.readAs(Uint32Array))[0] >>> 0;
    assert.strictEqual(gotSum, sum, "sumU32 mismatch");
    assert.strictEqual(gotMin, mn, "minU32 mismatch");
    assert.strictEqual(gotMax, mx, "maxU32 mismatch");
}

// 3) Reduction kernels f32.
{
    const n = 8192 + 37;
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = 1.0;
    const bufA = compute.createStorageBuffer({ label: "reduce:f32:in", data: a, copySrc: false });
    const outSum = kernels.sumF32(bufA);
    const outMin = kernels.minF32(bufA);
    const outMax = kernels.maxF32(bufA);
    const gotSum = (await outSum.readAs(Float32Array))[0];
    const gotMin = (await outMin.readAs(Float32Array))[0];
    const gotMax = (await outMax.readAs(Float32Array))[0];
    numberApproxEqual(gotSum, n, 1e-3, "sumF32 mismatch");
    numberApproxEqual(gotMin, 1.0, 1e-6, "minF32 mismatch");
    numberApproxEqual(gotMax, 1.0, 1e-6, "maxF32 mismatch");
}

// 4) Argmin / argmax f32.
{
    const a = new Float32Array([3.0, -2.5, 8.0, 1.25, -2.5, 7.0]);
    const bufA = compute.createStorageBuffer({ label: "argreduce:f32:in", data: a, copySrc: false });
    const outMin = kernels.argminF32(bufA);
    const outMax = kernels.argmaxF32(bufA);
    const minBytes = await outMin.read(0, 8);
    const maxBytes = await outMax.read(0, 8);
    const dvMin = new DataView(minBytes);
    const dvMax = new DataView(maxBytes);
    const minVal = dvMin.getFloat32(0, true);
    const minIdx = dvMin.getUint32(4, true);
    const maxVal = dvMax.getFloat32(0, true);
    const maxIdx = dvMax.getUint32(4, true);
    numberApproxEqual(minVal, -2.5, 1e-6, "argminF32 value mismatch");
    assert.strictEqual(minIdx, 1, "argminF32 index mismatch");
    numberApproxEqual(maxVal, 8.0, 1e-6, "argmaxF32 value mismatch");
    assert.strictEqual(maxIdx, 2, "argmaxF32 index mismatch");
}

// 5) Exclusive scan u32.
{
    const n = 4096 + 13;
    const a = makeRandomU32Array(n, 7);
    const bufA = compute.createStorageBuffer({ label: "scan:u32:in", data: a, copySrc: false });
    const out = kernels.scanExclusiveU32(bufA);
    const got = await out.readAs(Uint32Array);
    const expected = new Uint32Array(n);
    let acc = 0 >>> 0;
    for (let i = 0; i < n; i++) {
        expected[i] = acc;
        acc = (acc + (a[i] >>> 0)) >>> 0;
    }
    arraysEqualU32(got, expected, "scanExclusiveU32 mismatch");
}

// 6) Histogram u32 keys.
{
    const bins = 32;
    const n = 20000;
    const keys = new Uint32Array(n);
    for (let i = 0; i < n; i++) keys[i] = (Math.floor(random() * bins) >>> 0);
    const bufKeys = compute.createStorageBuffer({ label: "hist:u32:keys", data: keys, copySrc: false });
    const outBins = kernels.histogramU32(bufKeys, bins, { clear: true });
    const got = await outBins.readAs(Uint32Array);
    const expected = new Uint32Array(bins);
    for (let i = 0; i < n; i++) expected[keys[i]]++;
    arraysEqualU32(got, expected, "histogramU32 mismatch");
}

// 7) Compaction u32.
{
    const n = 4096 + 17;
    const input = makeRandomU32Array(n, 1000);
    const flags = new Uint32Array(n);
    for (let i = 0; i < n; i++) flags[i] = (random() < 0.35) ? 1 : 0;
    const bufIn = compute.createStorageBuffer({ label: "compact:u32:in", data: input, copySrc: false });
    const bufFlags = compute.createStorageBuffer({ label: "compact:u32:flags", data: flags, copySrc: false });
    const { output, count } = kernels.compactU32(bufIn, bufFlags);
    const gotCount = (await count.readAs(Uint32Array))[0] >>> 0;
    const gotOut = await output.readAs(Uint32Array);
    const expected = [];
    for (let i = 0; i < n; i++) if (flags[i] !== 0) expected.push(input[i] >>> 0);
    assert.strictEqual(gotCount, expected.length >>> 0, "compactU32 count mismatch");
    for (let i = 0; i < expected.length; i++) assert.strictEqual(gotOut[i] >>> 0, expected[i] >>> 0, `compactU32 output mismatch at index ${i}`);
}

// 8) Compaction f32.
{
    const n = 2048 + 9;
    const input = makeRandomF32Array(n, -5, 5);
    const flags = new Uint32Array(n);
    for (let i = 0; i < n; i++) flags[i] = (random() < 0.5) ? 1 : 0;
    const bufIn = compute.createStorageBuffer({ label: "compact:f32:in", data: input, copySrc: false });
    const bufFlags = compute.createStorageBuffer({ label: "compact:f32:flags", data: flags, copySrc: false });
    const { output, count } = kernels.compactF32(bufIn, bufFlags);
    const gotCount = (await count.readAs(Uint32Array))[0] >>> 0;
    const gotOut = await output.readAs(Float32Array);
    const expected = [];
    for (let i = 0; i < n; i++) if (flags[i] !== 0) expected.push(input[i]);
    assert.strictEqual(gotCount, expected.length >>> 0, "compactF32 count mismatch");
    for (let i = 0; i < expected.length; i++) numberApproxEqual(gotOut[i], expected[i], 1e-5, `compactF32 output mismatch at index ${i}`);
}

// 9) Radix sort u32 keys.
{
    const n = 10000 + 3;
    const keys = makeRandomU32Array(n, 0xFFFFFFFF >>> 0);
    const bufKeys = compute.createStorageBuffer({ label: "radix:u32:keys", data: keys, copySrc: false });
    const out = kernels.radixSortKeysU32(bufKeys, { inPlace: false });
    const got = await out.readAs(Uint32Array);
    const expected = Array.from(keys, (x) => x >>> 0).sort((a, b) => a - b);
    for (let i = 0; i < n; i++) assert.strictEqual(got[i] >>> 0, expected[i] >>> 0, `radixSortKeysU32 mismatch at index ${i}`);
}

// 10) Radix sort u32 key-value pairs.
{
    assert.strictEqual(typeof kernels.radixSortPairsU32, "function", "Missing kernel: radixSortPairsU32");

    {
        const keys = new Uint32Array([5, 1, 5, 3, 1, 0, 5, 3]);
        const values = new Uint32Array([50, 10, 51, 30, 11, 0, 52, 31]);
        const bufKeys = compute.createStorageBuffer({ label: "radix:pairs:keys", data: keys, copySrc: false });
        const bufValues = compute.createStorageBuffer({ label: "radix:pairs:values", data: values, copySrc: false });
        const outKeys = compute.createStorageBuffer({ label: "radix:pairs:outKeys", byteLength: keys.byteLength, copySrc: true });
        const outValues = compute.createStorageBuffer({ label: "radix:pairs:outValues", byteLength: values.byteLength, copySrc: true });
        const result = kernels.radixSortPairsU32(bufKeys, bufValues, { outKeys, outValues });
        assert.strictEqual(result.keys, outKeys, "Expected radixSortPairsU32 to return provided outKeys");
        assert.strictEqual(result.values, outValues, "Expected radixSortPairsU32 to return provided outValues");
        arraysEqualU32(await result.keys.readAs(Uint32Array), new Uint32Array([0, 1, 1, 3, 3, 5, 5, 5]), "radixSortPairsU32 keys mismatch");
        arraysEqualU32(await result.values.readAs(Uint32Array), new Uint32Array([0, 10, 11, 30, 31, 50, 51, 52]), "radixSortPairsU32 values mismatch");
    }

    {
        const keys = new Uint32Array([7, 4, 9, 4, 8, 2]);
        const values = new Uint32Array([70, 40, 90, 41, 80, 20]);
        const bufKeys = compute.createStorageBuffer({ label: "radix:pairs:keys:inPlace", data: keys, copySrc: true });
        const bufValues = compute.createStorageBuffer({ label: "radix:pairs:values:inPlace", data: values, copySrc: true });
        const result = kernels.radixSortPairsU32(bufKeys, bufValues, { inPlace: true });
        assert.strictEqual(result.keys, bufKeys, "Expected in-place radixSortPairsU32 to return the input keys buffer");
        assert.strictEqual(result.values, bufValues, "Expected in-place radixSortPairsU32 to return the input values buffer");
        arraysEqualU32(await bufKeys.readAs(Uint32Array), new Uint32Array([2, 4, 4, 7, 8, 9]), "radixSortPairsU32 in-place keys mismatch");
        arraysEqualU32(await bufValues.readAs(Uint32Array), new Uint32Array([20, 40, 41, 70, 80, 90]), "radixSortPairsU32 in-place values mismatch");
    }

    {
        const keys = new Uint32Array([9, 3, 1, 8, 2, 7]);
        const values = new Uint32Array([90, 30, 10, 80, 20, 70]);
        const bufKeys = compute.createStorageBuffer({ label: "radix:pairs:keys:partial", data: keys, copySrc: false });
        const bufValues = compute.createStorageBuffer({ label: "radix:pairs:values:partial", data: values, copySrc: false });
        const result = kernels.radixSortPairsU32(bufKeys, bufValues, { count: 4 });
        arraysEqualU32(await result.keys.readAs(Uint32Array), new Uint32Array([1, 3, 8, 9]), "radixSortPairsU32 partial keys mismatch");
        arraysEqualU32(await result.values.readAs(Uint32Array), new Uint32Array([10, 30, 80, 90]), "radixSortPairsU32 partial values mismatch");
    }

    {
        const shared = compute.createStorageBuffer({ label: "radix:pairs:shared", data: new Uint32Array([1, 0]), copySrc: false });
        assert.throws(() => kernels.radixSortPairsU32(shared, shared), /keys and values must be distinct/, "Expected radixSortPairsU32 to reject aliased key/value buffers");
    }

    {
        const keys = compute.createStorageBuffer({ label: "radix:pairs:alias:keys", data: new Uint32Array([2, 1]), copySrc: true });
        const values = compute.createStorageBuffer({ label: "radix:pairs:alias:values", data: new Uint32Array([20, 10]), copySrc: true });
        const outValues = compute.createStorageBuffer({ label: "radix:pairs:alias:outValues", byteLength: 8, copySrc: true });
        assert.throws(() => kernels.radixSortPairsU32(keys, values, { outKeys: keys, outValues }), /output buffers must be distinct from input buffers/, "Expected radixSortPairsU32 to reject aliased output buffers");
    }
}

// 11) Batched LU f32 (partial pivot: factor + solve).
{
    assert.strictEqual(typeof kernels.luFactorF32Batched, "function", "Missing kernel: luFactorF32Batched");
    assert.strictEqual(typeof kernels.luSolveF32Batched, "function", "Missing kernel: luSolveF32Batched");

    const luFactorCpuPivoted = (aFlat, n) => {
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

    const luSolveCpuPivoted = (LU, ipiv, n, b) => {
        const x = new Float32Array(n);
        for (let i = 0; i < n; i++) x[i] = b[i];
        for (let k = 0; k < n - 1; k++) {
            const p = ipiv[k] >>> 0;
            if (p !== k) {
                const t = x[k];
                x[k] = x[p];
                x[p] = t;
            }
        }
        for (let i = 0; i < n; i++) {
            let s = x[i];
            for (let j = 0; j < i; j++) s -= LU[i * n + j] * x[j];
            x[i] = s;
        }
        for (let i = n - 1; i >= 0; i--) {
            let s = x[i];
            for (let j = i + 1; j < n; j++) s -= LU[i * n + j] * x[j];
            x[i] = s / LU[i * n + i];
        }
        return x;
    };

    const batch = 3;
    const n = 4;
    const elems = batch * n * n;
    const a = new Float32Array(elems);
    const rhs = new Float32Array(batch * n);
    for (let b = 0; b < batch; b++) {
        const off = b * n * n;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) a[off + i * n + j] = (i === j) ? (4 + b + i) : (0.1 * (i + 1) - 0.07 * (j + 1) + 0.02 * b);
        }
        for (let i = 0; i < n; i++) rhs[b * n + i] = 0.5 + 0.1 * i + 0.03 * b;
    }

    const bufA = compute.createStorageBuffer({ label: "lu:f32:A", data: a, copySrc: true });
    const bufIpiv = compute.createStorageBuffer({ label: "lu:f32:ipiv", byteLength: batch * n * 4, copySrc: true });
    const bufRhs = compute.createStorageBuffer({ label: "lu:f32:rhs", data: rhs, copySrc: true });
    const bufX = compute.createStorageBuffer({ label: "lu:f32:x", byteLength: batch * n * 4, copySrc: true });

    kernels.luFactorF32Batched(bufA, bufIpiv, batch, n);
    kernels.luSolveF32Batched(bufA, bufIpiv, bufRhs, bufX, batch, n);

    const gotLu = await bufA.readAs(Float32Array);
    const gotIpiv = await bufIpiv.readAs(Uint32Array);
    const gotX = await bufX.readAs(Float32Array);

    for (let b = 0; b < batch; b++) {
        const slice = new Float32Array(n * n);
        for (let t = 0; t < n * n; t++) slice[t] = a[b * n * n + t];
        const { A: wantLu, ipiv: wantIpiv } = luFactorCpuPivoted(slice, n);
        for (let t = 0; t < n * n; t++) {
            numberApproxEqual(gotLu[b * n * n + t], wantLu[t], 2e-4, `LU factor batch ${b} index ${t}`);
        }
        for (let k = 0; k < n; k++) {
            assert.strictEqual(gotIpiv[b * n + k] >>> 0, wantIpiv[k] >>> 0, `ipiv batch ${b} k=${k}`);
        }
        const bRhs = rhs.subarray(b * n, (b + 1) * n);
        const wantX = luSolveCpuPivoted(wantLu, wantIpiv, n, bRhs);
        for (let i = 0; i < n; i++) {
            numberApproxEqual(gotX[b * n + i], wantX[i], 2e-3, `LU solve batch ${b} row ${i}`);
        }
        for (let i = 0; i < n; i++) {
            let ax = 0;
            for (let j = 0; j < n; j++) ax += slice[i * n + j] * wantX[j];
            numberApproxEqual(ax, bRhs[i], 2e-3, `residual batch ${b} row ${i}`);
        }
    }
}

// 12) Batched LU complex64 (partial pivot by |a|^2: factor + solve).
{
    assert.strictEqual(typeof kernels.luFactorComplex64Batched, "function", "Missing kernel: luFactorComplex64Batched");
    assert.strictEqual(typeof kernels.luSolveComplex64Batched, "function", "Missing kernel: luSolveComplex64Batched");

    const cxMul = (ar, ai, br, bi) => [ar * br - ai * bi, ar * bi + ai * br];
    const cxDiv = (ar, ai, br, bi) => {
        const d = br * br + bi * bi;
        return [(ar * br + ai * bi) / d, (ai * br - ar * bi) / d];
    };

    const luFactorCpuPivotedComplex = (aFlat2, n) => {
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
                for (let j = 0; j < n; j++) {
                    const ta = (k * n + j) * 2;
                    const tb = (piv * n + j) * 2;
                    let tmp = A[ta];
                    A[ta] = A[tb];
                    A[tb] = tmp;
                    tmp = A[ta + 1];
                    A[ta + 1] = A[tb + 1];
                    A[tb + 1] = tmp;
                }
            }
            const pk = (k * n + k) * 2;
            const diaR = A[pk];
            const diaI = A[pk + 1];
            for (let i = k + 1; i < n; i++) {
                const tik = (i * n + k) * 2;
                const [dr, di] = cxDiv(A[tik], A[tik + 1], diaR, diaI);
                A[tik] = dr;
                A[tik + 1] = di;
            }
            for (let i = k + 1; i < n; i++) {
                const likR = A[(i * n + k) * 2];
                const likI = A[(i * n + k) * 2 + 1];
                for (let j = k + 1; j < n; j++) {
                    const tkj = (k * n + j) * 2;
                    const tij = (i * n + j) * 2;
                    const [mr, mi] = cxMul(likR, likI, A[tkj], A[tkj + 1]);
                    A[tij] -= mr;
                    A[tij + 1] -= mi;
                }
            }
        }
        return { A, ipiv };
    };

    const luSolveCpuPivotedComplex = (LU, ipiv, n, b2) => {
        const x = new Float32Array(2 * n);
        for (let i = 0; i < n; i++) {
            x[2 * i] = b2[2 * i];
            x[2 * i + 1] = b2[2 * i + 1];
        }
        for (let k = 0; k < n - 1; k++) {
            const p = ipiv[k] >>> 0;
            if (p !== k) {
                const tk = 2 * k;
                const tp = 2 * p;
                let t0 = x[tk];
                let t1 = x[tk + 1];
                x[tk] = x[tp];
                x[tk + 1] = x[tp + 1];
                x[tp] = t0;
                x[tp + 1] = t1;
            }
        }
        for (let i = 0; i < n; i++) {
            let sr = x[2 * i];
            let si = x[2 * i + 1];
            for (let j = 0; j < i; j++) {
                const Lr = LU[(i * n + j) * 2];
                const Li = LU[(i * n + j) * 2 + 1];
                const [mr, mi] = cxMul(Lr, Li, x[2 * j], x[2 * j + 1]);
                sr -= mr;
                si -= mi;
            }
            x[2 * i] = sr;
            x[2 * i + 1] = si;
        }
        for (let i = n - 1; i >= 0; i--) {
            let sr = x[2 * i];
            let si = x[2 * i + 1];
            for (let j = i + 1; j < n; j++) {
                const Ur = LU[(i * n + j) * 2];
                const Ui = LU[(i * n + j) * 2 + 1];
                const [mr, mi] = cxMul(Ur, Ui, x[2 * j], x[2 * j + 1]);
                sr -= mr;
                si -= mi;
            }
            const [xr, xi] = cxDiv(sr, si, LU[(i * n + i) * 2], LU[(i * n + i) * 2 + 1]);
            x[2 * i] = xr;
            x[2 * i + 1] = xi;
        }
        return x;
    };

    const batch = 3;
    const n = 4;
    const cells = batch * n * n;
    const a = new Float32Array(cells * 2);
    const rhs = new Float32Array(batch * n * 2);
    for (let b = 0; b < batch; b++) {
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const t = ((b * n * n + i * n + j) * 2);
                const dre = (i === j) ? (4 + b + i) : (0.1 * (i + 1) - 0.07 * (j + 1) + 0.02 * b);
                const dim = (i === j) ? 0.15 : (0.05 * (i - j) + 0.01 * b);
                a[t] = dre;
                a[t + 1] = dim;
            }
        }
        for (let i = 0; i < n; i++) {
            const t = (b * n + i) * 2;
            rhs[t] = 0.5 + 0.1 * i + 0.03 * b;
            rhs[t + 1] = 0.2 - 0.05 * i + 0.02 * b;
        }
    }

    const bufA = compute.createStorageBuffer({ label: "lu:c64:A", data: a, copySrc: true });
    const bufIpiv = compute.createStorageBuffer({ label: "lu:c64:ipiv", byteLength: batch * n * 4, copySrc: true });
    const bufRhs = compute.createStorageBuffer({ label: "lu:c64:rhs", data: rhs, copySrc: true });
    const bufX = compute.createStorageBuffer({ label: "lu:c64:x", byteLength: batch * n * 8, copySrc: true });

    kernels.luFactorComplex64Batched(bufA, bufIpiv, batch, n);
    kernels.luSolveComplex64Batched(bufA, bufIpiv, bufRhs, bufX, batch, n);

    const gotLu = await bufA.readAs(Float32Array);
    const gotIpiv = await bufIpiv.readAs(Uint32Array);
    const gotX = await bufX.readAs(Float32Array);

    for (let b = 0; b < batch; b++) {
        const slice = new Float32Array(n * n * 2);
        for (let t = 0; t < n * n * 2; t++) slice[t] = a[b * n * n * 2 + t];
        const { A: wantLu, ipiv: wantIpiv } = luFactorCpuPivotedComplex(slice, n);
        for (let t = 0; t < n * n * 2; t++) {
            numberApproxEqual(gotLu[b * n * n * 2 + t], wantLu[t], 5e-4, `LU c64 factor batch ${b} index ${t}`);
        }
        for (let k = 0; k < n; k++) {
            assert.strictEqual(gotIpiv[b * n + k] >>> 0, wantIpiv[k] >>> 0, `ipiv c64 batch ${b} k=${k}`);
        }
        const bRhs = rhs.subarray(b * n * 2, (b + 1) * n * 2);
        const wantX = luSolveCpuPivotedComplex(wantLu, wantIpiv, n, bRhs);
        for (let i = 0; i < n; i++) {
            numberApproxEqual(gotX[b * n * 2 + 2 * i], wantX[2 * i], 3e-3, `LU c64 solve batch ${b} row ${i} re`);
            numberApproxEqual(gotX[b * n * 2 + 2 * i + 1], wantX[2 * i + 1], 3e-3, `LU c64 solve batch ${b} row ${i} im`);
        }
        for (let i = 0; i < n; i++) {
            let axr = 0;
            let axi = 0;
            for (let j = 0; j < n; j++) {
                const t = (i * n + j) * 2;
                const [mr, mi] = cxMul(slice[t], slice[t + 1], wantX[2 * j], wantX[2 * j + 1]);
                axr += mr;
                axi += mi;
            }
            numberApproxEqual(axr, bRhs[2 * i], 3e-3, `residual c64 batch ${b} row ${i} re`);
            numberApproxEqual(axi, bRhs[2 * i + 1], 3e-3, `residual c64 batch ${b} row ${i} im`);
        }
    }
}

// 13) Complex64 solve fallback path for n > 512 (identity LU should return rhs unchanged).
{
    const batch = 1;
    const n = 513;
    const lu = new Float32Array(batch * n * n * 2);
    const ipiv = new Uint32Array(batch * n);
    const rhs = new Float32Array(batch * n * 2);
    for (let i = 0; i < n; i++) {
        const diag = (i * n + i) * 2;
        lu[diag] = 1;
        ipiv[i] = i >>> 0;
        rhs[2 * i] = Math.sin(i * 0.17);
        rhs[2 * i + 1] = Math.cos(i * 0.11);
    }

    const bufLu = compute.createStorageBuffer({ label: "lu:c64:large:lu", data: lu, copySrc: false });
    const bufIpiv = compute.createStorageBuffer({ label: "lu:c64:large:ipiv", data: ipiv, copySrc: false });
    const bufRhs = compute.createStorageBuffer({ label: "lu:c64:large:rhs", data: rhs, copySrc: false });
    const bufX = compute.createStorageBuffer({ label: "lu:c64:large:x", byteLength: batch * n * 8, copySrc: true });

    kernels.luSolveComplex64Batched(bufLu, bufIpiv, bufRhs, bufX, batch, n);

    const gotX = await bufX.readAs(Float32Array);
    arraysApproxEqual(gotX, rhs, 1e-5, "LU c64 large solve mismatch");
}

// 14) Blocked-path regression for f32 LU at n >= 160 (covers lead/upper/trailing kernels).
{
    const n = 192;
    const batch = 2;
    const a = new Float32Array(batch * n * n);
    const rhs = new Float32Array(batch * n);
    // Diagonally dominant random matrix to keep f32 well-conditioned.
    let seed = 0x9e3779b1 >>> 0;
    const rand = () => {
        seed = ((seed + 0x6D2B79F5) >>> 0);
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
    };
    for (let b = 0; b < batch; b++) {
        for (let i = 0; i < n; i++) {
            let rowMag = 0;
            for (let j = 0; j < n; j++) {
                const v = (rand() - 0.5) * (1.0 / n);
                a[b * n * n + i * n + j] = v;
                rowMag += Math.abs(v);
            }
            a[b * n * n + i * n + i] = rowMag + 1 + b * 0.25;
            rhs[b * n + i] = rand();
        }
    }

    const bufA = compute.createStorageBuffer({ label: "lu:f32:blk:A", data: a, copySrc: true });
    const bufIpiv = compute.createStorageBuffer({ label: "lu:f32:blk:ipiv", byteLength: batch * n * 4, copySrc: true });
    const bufRhs = compute.createStorageBuffer({ label: "lu:f32:blk:rhs", data: rhs, copySrc: false });
    const bufX = compute.createStorageBuffer({ label: "lu:f32:blk:x", byteLength: batch * n * 4, copySrc: true });

    kernels.luFactorF32Batched(bufA, bufIpiv, batch, n);
    kernels.luSolveF32Batched(bufA, bufIpiv, bufRhs, bufX, batch, n);
    const gotX = await bufX.readAs(Float32Array);

    // Validate by computing the residual ||A x - b||_inf / ||b||_inf with the original A.
    for (let b = 0; b < batch; b++) {
        let bMax = 0;
        for (let i = 0; i < n; i++) bMax = Math.max(bMax, Math.abs(rhs[b * n + i]));
        let resMax = 0;
        for (let i = 0; i < n; i++) {
            let ax = 0;
            for (let j = 0; j < n; j++) ax += a[b * n * n + i * n + j] * gotX[b * n + j];
            resMax = Math.max(resMax, Math.abs(ax - rhs[b * n + i]));
        }
        assert.ok(resMax / Math.max(bMax, 1e-30) < 1e-3,
            `f32 blocked LU residual too large: batch ${b} -> ${resMax}/${bMax}`);
    }
}

// 15) Blocked-path regression for c64 LU at n >= 160 (covers lead/upper/trailing kernels).
{
    const n = 192;
    const batch = 2;
    const a = new Float32Array(batch * n * n * 2);
    const rhs = new Float32Array(batch * n * 2);
    let seed = 0x12345678 >>> 0;
    const rand = () => {
        seed = ((seed + 0x6D2B79F5) >>> 0);
        let t = seed;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (((t ^ (t >>> 14)) >>> 0) / 4294967296);
    };
    for (let b = 0; b < batch; b++) {
        for (let i = 0; i < n; i++) {
            let rowMag = 0;
            for (let j = 0; j < n; j++) {
                const re = (rand() - 0.5) * (1.0 / n);
                const im = (rand() - 0.5) * (1.0 / n);
                const t = (b * n * n + i * n + j) * 2;
                a[t] = re;
                a[t + 1] = im;
                rowMag += Math.hypot(re, im);
            }
            const td = (b * n * n + i * n + i) * 2;
            a[td] = rowMag + 1 + b * 0.25;
            a[td + 1] = 0.5;
            const tr = (b * n + i) * 2;
            rhs[tr] = rand();
            rhs[tr + 1] = rand();
        }
    }

    const bufA = compute.createStorageBuffer({ label: "lu:c64:blk:A", data: a, copySrc: true });
    const bufIpiv = compute.createStorageBuffer({ label: "lu:c64:blk:ipiv", byteLength: batch * n * 4, copySrc: true });
    const bufRhs = compute.createStorageBuffer({ label: "lu:c64:blk:rhs", data: rhs, copySrc: false });
    const bufX = compute.createStorageBuffer({ label: "lu:c64:blk:x", byteLength: batch * n * 8, copySrc: true });

    kernels.luFactorComplex64Batched(bufA, bufIpiv, batch, n);
    kernels.luSolveComplex64Batched(bufA, bufIpiv, bufRhs, bufX, batch, n);
    const gotX = await bufX.readAs(Float32Array);

    for (let b = 0; b < batch; b++) {
        let bMax = 0;
        for (let i = 0; i < n; i++) {
            bMax = Math.max(bMax, Math.hypot(rhs[(b * n + i) * 2], rhs[(b * n + i) * 2 + 1]));
        }
        let resMax = 0;
        for (let i = 0; i < n; i++) {
            let axr = 0;
            let axi = 0;
            for (let j = 0; j < n; j++) {
                const ta = (b * n * n + i * n + j) * 2;
                const tx = (b * n + j) * 2;
                const ar = a[ta];
                const ai = a[ta + 1];
                const xr = gotX[tx];
                const xi = gotX[tx + 1];
                axr += ar * xr - ai * xi;
                axi += ar * xi + ai * xr;
            }
            const tr = (b * n + i) * 2;
            resMax = Math.max(resMax, Math.hypot(axr - rhs[tr], axi - rhs[tr + 1]));
        }
        assert.ok(resMax / Math.max(bMax, 1e-30) < 1e-3,
            `c64 blocked LU residual too large: batch ${b} -> ${resMax}/${bMax}`);
    }
}

// 16) Cleanup releases the shared compute context before its browser GPU device.
{
    compute.destroy();
    await destroyTestDevice(device);
}
