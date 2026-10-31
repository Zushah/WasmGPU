/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, destroyTestDevice, setupTest } from "./utils/helpers.js";
import { initWebAssembly, Compute, wasm } from "../release/WasmGPU.js";

const { device } = await setupTest({ initWebAssembly, webgpu: true });
const compute = new Compute(device, device.queue);

const valuesOf = (a) => { const out = []; const visit = (index) => { if (index.length === a.ndim) { out.push(a.get(...index)); return; } for (let i = 0; i < a.shape[index.length]; i++) visit([...index, i]); }; visit([]); return out; };
const readGPU = async (a) => { const cpu = await compute.ndarray.toCPU(a); try { return valuesOf(cpu); } finally { cpu.destroy(); } };
const bytesOf = async (a) => {
    const cpu = (a.residency === "gpu") ? await compute.ndarray.toCPU(a) : a;
    const dense = compute.ndarray.contiguous(cpu);
    try { const data = dense.data(); return Array.from(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)); } finally { dense.destroy(); if (cpu !== a) cpu.destroy(); }
};
const fromBits = (dtype, shape, words) => { const a = compute.ndarray.zeros(dtype, { shape }); const data = a.data(); new Uint32Array(data.buffer, data.byteOffset, words.length).set(words); return a; };

// 1) CPU: contiguous row-major.
{
    const a = compute.ndarray.zeros("f32", { shape: [2, 3] });
    assert.strictEqual(a.residency, "cpu");
    assert.strictEqual(a.isContiguousC, true);
    assert.strictEqual(a.numel, 6);

    const v = a.data();
    assert.ok(v instanceof Float32Array, "Expected Float32Array view");
    for (let i = 0; i < v.length; i++) v[i] = i + 1;

    assert.strictEqual(a.get(0, 0), 1);
    assert.strictEqual(a.get(0, 2), 3);
    assert.strictEqual(a.get(1, 0), 4);
    assert.strictEqual(a.get(1, 2), 6);

    a.set(123, 1, 1);
    assert.strictEqual(a.get(1, 1), 123);
    a.destroy();
}

// 2) CPU: custom stride (interleaved / gapped layout).
{
    // 2x3 f32 where each element is 8 bytes apart (4 bytes padding between elements).
    const a = compute.ndarray.zeros("f32", {
        shape: [2, 3],
        stridesBytes: [3 * 8, 8],
        offsetBytes: 0
    });

    assert.strictEqual(a.isContiguousC, false);
    assert.throws(() => a.data(), /contiguous row-major/i);

    a.set(10, 0, 0);
    a.set(11, 0, 1);
    a.set(12, 0, 2);
    a.set(20, 1, 0);
    a.set(21, 1, 1);
    a.set(22, 1, 2);

    assert.strictEqual(a.get(0, 0), 10);
    assert.strictEqual(a.get(0, 1), 11);
    assert.strictEqual(a.get(0, 2), 12);
    assert.strictEqual(a.get(1, 0), 20);
    assert.strictEqual(a.get(1, 1), 21);
    assert.strictEqual(a.get(1, 2), 22);
    a.destroy();
}

// 3) Contiguous roundtrip.
{
    const a = compute.ndarray.fromArray("f32", [2, 3], [1, 2, 3, 4, 5, 6]);
    const ga = compute.ndarray.toGPU(a, { label: "ndarray_roundtrip_contiguous" });
    assert.strictEqual(ga.residency, "gpu");

    const b = await compute.ndarray.toCPU(ga);
    assert.strictEqual(b.residency, "cpu");
    assert.strictEqual(b.isContiguousC, true);

    assert.deepStrictEqual(Array.from(b.data()), [1, 2, 3, 4, 5, 6]);
    b.destroy();
    ga.destroy();
    a.destroy();
}

// 4) Gapped/interleaved roundtrip.
{
    const a = compute.ndarray.zeros("f32", {
        shape: [2, 3],
        stridesBytes: [3 * 8, 8],
        offsetBytes: 0
    });

    a.set(10, 0, 0);
    a.set(11, 0, 1);
    a.set(12, 0, 2);
    a.set(20, 1, 0);
    a.set(21, 1, 1);
    a.set(22, 1, 2);

    const ga = compute.ndarray.toGPU(a, { label: "ndarray_roundtrip_gapped" });
    const b = await compute.ndarray.toCPU(ga);

    assert.strictEqual(b.isContiguousC, false);
    assert.strictEqual(b.get(0, 0), 10);
    assert.strictEqual(b.get(0, 1), 11);
    assert.strictEqual(b.get(0, 2), 12);
    assert.strictEqual(b.get(1, 0), 20);
    assert.strictEqual(b.get(1, 1), 21);
    assert.strictEqual(b.get(1, 2), 22);
    b.destroy();
    ga.destroy();
    a.destroy();
}

// 5) Readback requires copySrc: true.
{
    const a = compute.ndarray.fromArray("f32", [1], [42]);
    const ga = compute.ndarray.toGPU(a, { copySrc: false });

    let threw = false;
    try {
        await compute.ndarray.toCPU(ga);
    } catch (e) {
        threw = true;
    }
    assert.strictEqual(threw, true, "Expected toCPU() to throw when copySrc is not enabled");
    ga.destroy();
    a.destroy();
}

// 6) CPU: owned WebAssembly allocations have deterministic, guarded lifetimes.
{
    const a = compute.ndarray.fromArray("f32", [2, 2], [1, 2, 3, 4]);
    assert.strictEqual(a.destroyed, false);
    assert.ok(a.basePtrBytes > 0);
    assert.ok(a.shapePtr > 0);
    assert.ok(a.stridesPtr > 0);
    a.destroy();
    assert.strictEqual(a.destroyed, true);
    assert.throws(() => a.basePtrBytes, /destroyed/i);
    assert.throws(() => a.shapePtr, /destroyed/i);
    assert.throws(() => a.stridesPtr, /destroyed/i);
    assert.throws(() => a.backingBytes(), /destroyed/i);
    assert.throws(() => a.data(), /destroyed/i);
    assert.throws(() => a.get(0, 0), /destroyed/i);
    assert.throws(() => a.set(5, 0, 0), /destroyed/i);
    assert.throws(() => a.zero_(), /destroyed/i);
    assert.throws(() => compute.ndarray.toGPU(a), /destroyed/i);
    assert.doesNotThrow(() => a.destroy(), "CPUndarray.destroy() must be idempotent");
}

// 7) CPU: repeated allocation/destruction reuses heap storage instead of growing linearly.
{
    const churn = () => {
        const a = compute.ndarray.zeros("u8", { shape: [256 * 1024] });
        const bytes = a.backingBytes();
        bytes[0] = 0x35;
        bytes[bytes.length - 1] = 0x79;
        a.destroy();
    };
    churn();
    const stabilizedHeapBytes = wasm.memory().buffer.byteLength;
    for (let i = 0; i < 64; i++) churn();
    assert.strictEqual(wasm.memory().buffer.byteLength, stabilizedHeapBytes, "Destroyed CPUndarray storage must be reusable under fixed-size churn");
}

// 8) f64 storage roundtrips through GPU bytes and can be explicitly downcast before GPU use.
{
    const values = new Float64Array([Math.PI, 1 + Number.EPSILON, -Math.E, Number.MIN_VALUE]);
    const a = compute.ndarray.fromArray("f64", [2, 2], values);
    assert.ok(a.data() instanceof Float64Array, "f64 CPU ndarrays must expose Float64Array data");
    assert.strictEqual(a.wgslElementType, null, "f64 storage must not claim a native WGSL element type");
    const ga = compute.ndarray.toGPU(a, { label: "ndarray_roundtrip_f64_storage" });
    const b = await compute.ndarray.toCPU(ga);
    assert.ok(b.data() instanceof Float64Array);
    assert.deepStrictEqual(Array.from(b.data()), Array.from(values), "GPU storage/copy/readback must preserve f64 values and bytes");

    const downcast = compute.ndarray.fromArray("f32", [2, 2], values);
    assert.ok(downcast.data() instanceof Float32Array);
    assert.deepStrictEqual(Array.from(downcast.data()), Array.from(new Float32Array(values)), "f64-to-f32 conversion must be explicit and follow typed-array conversion semantics");
    downcast.destroy();
    b.destroy();
    ga.destroy();
    a.destroy();
}

// 9) Checked scalar indexing handles negative strides, scalars, empty layouts, and invalid indices locally.
{
    const reversed = compute.ndarray.zeros("u32", { shape: [3], stridesBytes: [-4], offsetBytes: 8 });
    reversed.set(10, 0);
    reversed.set(20, 1);
    reversed.set(30, 2);
    assert.deepStrictEqual([reversed.get(0), reversed.get(1), reversed.get(2)], [10, 20, 30]);
    assert.throws(() => reversed.get(), /expected 1 indices/);
    assert.throws(() => reversed.get(-1), /integer >= 0/);
    assert.throws(() => reversed.get(1.5), /integer >= 0/);
    assert.throws(() => reversed.get(3), /out of bounds/);
    assert.throws(() => reversed.get(0x1_0000_0000), /fit in u32/);
    reversed.destroy();

    const scalar = compute.ndarray.zeros("f64", { shape: [] });
    scalar.set(Math.PI);
    assert.strictEqual(scalar.get(), Math.PI);
    assert.throws(() => scalar.get(0), /expected 0 indices/);
    scalar.destroy();

    const empty = compute.ndarray.empty("u8", { shape: [0, 3] });
    assert.strictEqual(empty.byteLength, 0);
    assert.throws(() => empty.get(0, 0), /out of bounds/);
    empty.destroy();
    assert.throws(() => compute.ndarray.empty("u8", { shape: [0x1_0000_0000], stridesBytes: [0] }), /fit in u32/);
}

// 10) Concurrent GPU ndarray readbacks use reusable slots and preserve direct-to-Wasm destinations.
{
    const arrays = Array.from({ length: 5 }, (_, i) => compute.ndarray.fromArray("u32", [4], [i, i + 1, i + 2, i + 3]));
    const gpu = arrays.map((a) => compute.ndarray.toGPU(a));
    const cpu = await Promise.all(gpu.map((a) => compute.ndarray.toCPU(a)));
    for (let i = 0; i < cpu.length; i++) assert.deepStrictEqual(Array.from(cpu[i].data()), [i, i + 1, i + 2, i + 3]);
    for (const a of cpu) a.destroy();
    for (const a of gpu) a.destroy();
    for (const a of arrays) a.destroy();
}

// 11) Odd-byte and zero-byte ndarrays preserve logical lengths across aligned GPU storage/readback.
{
    const odd = compute.ndarray.fromArray("u8", [3], [0x12, 0x34, 0x56]);
    const oddGpu = compute.ndarray.toGPU(odd);
    const oddBack = await compute.ndarray.toCPU(oddGpu);
    assert.deepStrictEqual(Array.from(oddBack.data()), [0x12, 0x34, 0x56]);
    oddBack.destroy();
    oddGpu.destroy();
    odd.destroy();

    const empty = compute.ndarray.empty("u8", { shape: [0] });
    const emptyGpu = compute.ndarray.toGPU(empty);
    const emptyBack = await compute.ndarray.toCPU(emptyGpu);
    assert.strictEqual(emptyBack.byteLength, 0);
    emptyBack.destroy();
    emptyGpu.destroy();
    empty.destroy();
}

// 12) Relaxed C-contiguity ignores size-1 strides and layout offsets, so contiguous slices expose data().
{
    const unit = compute.ndarray.empty("f32", { shape: [2, 1, 3], stridesBytes: [12, -100, 4] });
    const offset = compute.ndarray.empty("u16", { shape: [3], offsetBytes: 6 });
    assert.strictEqual(unit.isContiguousC, true);
    assert.strictEqual(offset.isContiguousC, true);
    unit.destroy();
    offset.destroy();
    const a = compute.ndarray.fromArray("i32", [3, 4], Array.from({ length: 12 }, (_, i) => i));
    const rows = compute.ndarray.slice(a, [[1, 3]]);
    assert.strictEqual(rows.isContiguousC, true);
    assert.deepStrictEqual(Array.from(rows.data()), [4, 5, 6, 7, 8, 9, 10, 11]);
    const columns = compute.ndarray.slice(a, [null, [1, 3]]);
    assert.strictEqual(columns.isContiguousC, false);
    assert.throws(() => columns.data(), /contiguous row-major/i);
    a.destroy();
}

// 13) Views borrow their base, follow NumPy semantics, rebase their extent, and become invalid with their base.
{
    const a = compute.ndarray.fromArray("f32", [3, 4], Array.from({ length: 12 }, (_, i) => i));
    assert.ok(a instanceof compute.ndarray);
    assert.ok(!({} instanceof compute.ndarray));
    assert.strictEqual(a.base, null);
    const reversed = compute.ndarray.slice(a, [[null, null, -1], [3, 0, -2]]);
    assert.deepStrictEqual(reversed.shape, [3, 2]);
    assert.deepStrictEqual(valuesOf(reversed), [11, 9, 7, 5, 3, 1]);
    const t = compute.ndarray.transpose(a);
    assert.deepStrictEqual([t.shape, t.get(1, 2), t.base === a], [[4, 3], 9, true]);
    assert.deepStrictEqual(valuesOf(compute.ndarray.reshape(a, [2, -1])), Array.from({ length: 12 }, (_, i) => i));
    assert.throws(() => compute.ndarray.reshape(t, [12]), /requires a copy/);
    const broadcast = compute.ndarray.broadcastTo(compute.ndarray.slice(a, [0]), [2, 4]);
    assert.deepStrictEqual([broadcast.stridesBytes, valuesOf(broadcast)], [[0, 4], [0, 1, 2, 3, 0, 1, 2, 3]]);
    assert.strictEqual(broadcast.base, a, "Views of views must reference the owning root");
    assert.deepStrictEqual(valuesOf(compute.ndarray.slice(compute.ndarray.flip(a, 1), [0])), [3, 2, 1, 0]);
    const expanded = compute.ndarray.expandDims(a, [0, -1]);
    assert.deepStrictEqual(expanded.shape, [1, 3, 4, 1]);
    assert.deepStrictEqual(compute.ndarray.squeeze(expanded).shape, [3, 4]);
    assert.throws(() => compute.ndarray.squeeze(a, 0), /cannot squeeze/);
    const view = compute.ndarray.slice(a, [1]);
    view.set(42, 0);
    assert.strictEqual(a.get(1, 0), 42, "View writes must reach the base");
    view.destroy();
    assert.strictEqual(a.get(1, 0), 42, "Destroying a view must leave its base intact");
    a.destroy();
    assert.strictEqual(t.destroyed, true);
    assert.throws(() => t.get(0, 0), /destroyed/);

    const g = compute.ndarray.fromArray("u8", [8, 8], Array.from({ length: 64 }, (_, i) => i), { residency: "gpu" });
    const crop = compute.ndarray.slice(g, [[2, 4], [1, 5]]);
    assert.deepStrictEqual([crop.residency, crop.baseOffsetBytes, crop.offsetBytes, crop.byteLength], ["gpu", 16, 1, 13]);
    const back = await compute.ndarray.toCPU(crop);
    assert.strictEqual(back.byteLength, 13, "Transfers of rebased views must copy only the view's extent");
    assert.deepStrictEqual(valuesOf(back), [17, 18, 19, 20, 25, 26, 27, 28]);
    back.destroy();
    g.destroy();
    await assert.rejects(() => compute.ndarray.toCPU(crop), /destroyed/);
}

// 14) contiguous and cast return owned C-contiguous arrays in the input's residency with bit-exact CPU/GPU conversions.
{
    const a = compute.ndarray.fromArray("f32", [2, 3], [1.5, -2.5, 300.7, -1e10, NaN, Infinity]);
    const t = compute.ndarray.transpose(a);
    const c = compute.ndarray.contiguous(t);
    assert.deepStrictEqual([c.residency, c.base, c.isContiguousC, c.shape], ["cpu", null, true, [3, 2]]);
    assert.deepStrictEqual(Array.from(c.data()), [1.5, -1e10, -2.5, NaN, 300.7, Infinity].map(Math.fround));
    assert.deepStrictEqual(Array.from(compute.ndarray.cast(t, "u8").data()), [1, 0, 0, 0, 255, 255], "Float-to-int casts truncate and saturate by default");
    assert.deepStrictEqual(Array.from(compute.ndarray.cast(t, "i16", { overflow: "wrap", rounding: "nearest-even" }).data()), [2, 7168, -2, 0, 301, 0], "Wrapping casts match typed-array modular semantics");
    const g = compute.ndarray.toGPU(a);
    const gc = compute.ndarray.cast(compute.ndarray.transpose(g), "u8");
    assert.strictEqual(gc.residency, "gpu");
    assert.deepStrictEqual(await readGPU(gc), [1, 0, 0, 0, 255, 255]);
    const d = compute.ndarray.fromArray("f64", [4], [1 + 2 ** -24, 3.5e38, 1.5 * 2 ** -149, -0], { residency: "gpu" });
    assert.deepStrictEqual(await readGPU(compute.ndarray.cast(d, "f32")), Array.from(new Float32Array([1 + 2 ** -24, 3.5e38, 1.5 * 2 ** -149, -0])), "GPU f64-to-f32 casts round to nearest even");
    assert.throws(() => compute.ndarray.cast(d, "i32"), /f64 <-> integer casts are not supported on the GPU/);
    a.destroy();
    g.destroy();
    d.destroy();
}

// 15) copyInto converts dtypes, broadcasts sources, and keeps value semantics for overlapping memory.
{
    const dst = compute.ndarray.zeros("i32", { shape: [2, 3] });
    compute.ndarray.copyInto(dst, compute.ndarray.fromArray("f64", [3], [1.9, -1.9, 1e12]));
    assert.deepStrictEqual(Array.from(dst.data()), [1, -1, 2147483647, 1, -1, 2147483647]);
    assert.throws(() => compute.ndarray.copyInto(compute.ndarray.broadcastTo(compute.ndarray.slice(dst, [0]), [2, 3]), dst), /more than once/);
    const a = compute.ndarray.fromArray("u16", [6], [1, 2, 3, 4, 5, 6]);
    compute.ndarray.copyInto(compute.ndarray.slice(a, [[1, 6]]), compute.ndarray.slice(a, [[0, 5]]));
    assert.deepStrictEqual(Array.from(a.data()), [1, 1, 2, 3, 4, 5]);
    const g = compute.ndarray.fromArray("u16", [6], [1, 2, 3, 4, 5, 6], { residency: "gpu" });
    compute.ndarray.copyInto(compute.ndarray.slice(g, [[0, 5]]), compute.ndarray.slice(g, [[1, 6]]));
    assert.deepStrictEqual(await readGPU(g), [2, 3, 4, 5, 6, 6], "Same-buffer GPU copies must stage their source");
    assert.throws(() => compute.ndarray.copyInto(g, a), /same residency/);
    dst.destroy();
    a.destroy();
    g.destroy();
}

// 16) pad follows NumPy's np.pad modes with identical CPU and GPU results.
{
    const expected = {
        constant: [9, 9, 1, 2, 3, 9, 9, 9],
        edge: [1, 1, 1, 2, 3, 3, 3, 3],
        reflect: [3, 2, 1, 2, 3, 2, 1, 2],
        symmetric: [2, 1, 1, 2, 3, 3, 2, 1],
        wrap: [2, 3, 1, 2, 3, 1, 2, 3]
    };
    const a = compute.ndarray.fromArray("i32", [3], [1, 2, 3]);
    const g = compute.ndarray.toGPU(a);
    for (const [mode, values] of Object.entries(expected)) {
        const options = { width: [2, 3], mode, ...(mode === "constant" ? { value: 9 } : {}) };
        assert.deepStrictEqual(Array.from(compute.ndarray.pad(a, options).data()), values, `np.pad(a, (2, 3), mode="${mode}")`);
        assert.deepStrictEqual(await readGPU(compute.ndarray.pad(g, options)), values, `GPU np.pad(a, (2, 3), mode="${mode}")`);
    }
    const b = compute.ndarray.fromArray("u8", [2, 3], [0, 1, 2, 3, 4, 5], { residency: "gpu" });
    assert.deepStrictEqual(await readGPU(compute.ndarray.pad(b, { width: [[1, 1], [2, 0]], mode: "reflect" })), [5, 4, 3, 4, 5, 2, 1, 0, 1, 2, 5, 4, 3, 4, 5, 2, 1, 0, 1, 2]);
    assert.throws(() => compute.ndarray.pad(a, { width: -1 }), /integers >= 0/);
    assert.throws(() => compute.ndarray.pad(a, { width: 1, value: 0.5 }), /not exactly representable/);
    a.destroy();
    g.destroy();
    b.destroy();
}

// 17) normalize applies per-axis affine maps in f64 on CPU and f32 on GPU, rounding integer outputs half to even.
{
    const { arraysApproxEqual } = createApproxHelpers(1e-6);
    const a = compute.ndarray.fromArray("u8", [2, 3], [0, 10, 20, 30, 40, 50]);
    const scaled = compute.ndarray.normalize(a, { scale: [1, 0.5, 0.25], offset: 1, axis: 1 });
    assert.deepStrictEqual([scaled.dtype, Array.from(scaled.data())], ["f32", [1, 6, 6, 31, 21, 13.5]]);
    // torchvision.transforms.Normalize(mean, std) on a channels-first tensor, evaluated in f64 on the CPU.
    const mean = [0.485, 0.456, 0.406], std = [0.229, 0.224, 0.225];
    const x = [0.5, 1, 0, 0.25, 0.75, 0.125];
    const image = compute.ndarray.fromArray("f32", [3, 2], x);
    const expected = x.map((v, i) => Math.fround((v - mean[i >> 1]) / std[i >> 1]));
    assert.deepStrictEqual(Array.from(compute.ndarray.normalize(image, { mean, std, axis: 0 }).data()), expected);
    const gpuImage = compute.ndarray.toGPU(image);
    arraysApproxEqual(await readGPU(compute.ndarray.normalize(gpuImage, { mean, std, axis: -2 })), expected, 1e-6, "GPU normalize must stay within f32 tolerance");
    const halves = compute.ndarray.fromArray("f32", [6], [0.5, 1.5, 2.5, -3, 300, NaN]);
    assert.deepStrictEqual(Array.from(compute.ndarray.normalize(halves, { scale: 1, dtype: "u8" }).data()), [0, 2, 2, 0, 255, 0], "Integer outputs round half to even, saturate, and map NaN to 0");
    assert.deepStrictEqual(await readGPU(compute.ndarray.normalize(compute.ndarray.toGPU(compute.ndarray.slice(halves, [[0, 5]])), { offset: 0, dtype: "i8" })), [0, 2, 2, -3, 127]);
    assert.throws(() => compute.ndarray.normalize(a, { scale: 2, mean: 1, std: 1 }), /not both/);
    assert.throws(() => compute.ndarray.normalize(a, { mean: [1, 2, 3], std: 1 }), /axis is required/);
    assert.throws(() => compute.ndarray.normalize(gpuImage, { scale: 1, dtype: "f64" }), /does not support f64/);
    a.destroy();
    image.destroy();
    gpuImage.destroy();
    halves.destroy();
}

// 18) resize reproduces PyTorch's bilinear and nearest-exact conventions on CPU and GPU.
{
    const { arraysApproxEqual } = createApproxHelpers(1e-12);
    const x = compute.ndarray.fromArray("f64", [2, 3], [1, 2, 4, 8, 16, 32]);
    // torch.nn.functional.interpolate(x[None, None], size=(4, 5), mode="bilinear", align_corners=False)
    const halfPixel = [1, 1.4, 2, 3.2, 4, 2.75, 3.85, 5.5, 8.8, 11, 6.25, 8.75, 12.5, 20, 25, 8, 11.2, 16, 25.6, 32];
    // torch.nn.functional.interpolate(x[None, None], size=(4, 5), mode="bilinear", align_corners=True)
    const corners = [1, 1.5, 2, 3, 4, 10 / 3, 5, 20 / 3, 10, 40 / 3, 17 / 3, 8.5, 34 / 3, 17, 68 / 3, 8, 12, 16, 24, 32];
    // torch.nn.functional.interpolate(x[None, None], size=(4, 5), mode="nearest-exact")
    const nearest = [1, 1, 2, 4, 4, 1, 1, 2, 4, 4, 8, 8, 16, 32, 32, 8, 8, 16, 32, 32];
    arraysApproxEqual(Array.from(compute.ndarray.resize(x, { axes: [0, 1], size: [4, 5] }).data()), halfPixel);
    arraysApproxEqual(Array.from(compute.ndarray.resize(x, { axes: [0, 1], size: [4, 5], alignCorners: true }).data()), corners);
    assert.deepStrictEqual(Array.from(compute.ndarray.resize(x, { axes: [0, 1], size: [4, 5], method: "nearest" }).data()), nearest);
    const g = compute.ndarray.toGPU(compute.ndarray.cast(x, "f32"));
    arraysApproxEqual(await readGPU(compute.ndarray.resize(g, { axes: [-2, -1], size: [4, 5] })), halfPixel, 1e-5, "GPU bilinear resize must stay within f32 tolerance");
    arraysApproxEqual(await readGPU(compute.ndarray.resize(g, { axes: [0, 1], size: [4, 5], alignCorners: true })), corners, 1e-5, "GPU align-corners resize must stay within f32 tolerance");
    assert.deepStrictEqual(await readGPU(compute.ndarray.resize(g, { axes: [0, 1], size: [4, 5], method: "nearest" })), nearest, "Nearest resize must be bit-exact on the GPU");
    const hwc = compute.ndarray.fromArray("u8", [2, 2, 2], [0, 100, 255, 50, 10, 0, 20, 200]);
    const batched = compute.ndarray.resize(hwc, { axes: [0, 1], size: [1, 1] });
    assert.deepStrictEqual([batched.shape, Array.from(batched.data())], [[1, 1, 2], [71, 88]], "Batched channels round half to even into u8");
    assert.deepStrictEqual(await readGPU(compute.ndarray.resize(compute.ndarray.toGPU(hwc), { axes: [0, 1], size: [1, 1] })), [71, 88]);
    const infinite = compute.ndarray.fromArray("f32", [1, 3], [Infinity, 2, -Infinity]);
    assert.deepStrictEqual([Array.from(compute.ndarray.resize(infinite, { axes: [0, 1], size: [1, 3] }).data()), await readGPU(compute.ndarray.resize(compute.ndarray.toGPU(infinite), { axes: [0, 1], size: [1, 3] }))], [[Infinity, 2, -Infinity], [Infinity, 2, -Infinity]], "Same-size linear resizes must reproduce infinities exactly on CPU and GPU");
    assert.throws(() => compute.ndarray.resize(x, { axes: [0, 1], size: [2, 2], method: "nearest", alignCorners: true }), /alignCorners applies only/);
    x.destroy();
    g.destroy();
    hwc.destroy();
    infinite.destroy();
}

// 19) GPU operations recorded into a caller's encoder match self-submitted results and reuse scratch memory.
{
    const bitsOf = async (a) => { const cpu = await compute.ndarray.toCPU(a); try { return Array.from(new Uint8Array(cpu.data().buffer, cpu.data().byteOffset, cpu.data().byteLength)); } finally { cpu.destroy(); } };
    const g = compute.ndarray.fromArray("f32", [3, 4], [0.5, -1.5, 2.5, 300.7, -7, 8.25, NaN, Infinity, 1e-3, -0, 42, -42], { residency: "gpu" });
    const ops = [
        (options) => compute.ndarray.cast(compute.ndarray.transpose(g), "i16", options),
        (options) => compute.ndarray.pad(g, { width: [[1, 0], [2, 1]], mode: "reflect", ...options }),
        (options) => compute.ndarray.resize(g, { axes: [0, 1], size: [5, 7], ...options })
    ];
    const expected = [];
    for (const op of ops) expected.push(await bitsOf(op({})));
    const kernelIn = compute.ndarray.fromArray("f32", [4], [1, 2, 3, 4], { residency: "gpu" });
    const encoder = device.createCommandEncoder();
    const recorded = [];
    for (let i = 0; i < ops.length; i++) {
        recorded.push(ops[i]({ encoder }));
        compute.ndarray.contiguous(g);
        compute.kernels.scl(kernelIn, i + 2);
        compute.ndarray.normalize(g, { scale: i + 1, offset: -i });
    }
    const shared = compute.ndarray.fromArray("u16", [6], [1, 2, 3, 4, 5, 6], { residency: "gpu" });
    compute.ndarray.copyInto(compute.ndarray.slice(shared, [[0, 5]]), compute.ndarray.slice(shared, [[1, 6]]), { encoder });
    compute.ndarray.copyInto(compute.ndarray.slice(shared, [[1, 6]]), compute.ndarray.slice(shared, [[0, 5]]));
    device.queue.submit([encoder.finish()]);
    for (let i = 0; i < ops.length; i++) assert.deepStrictEqual(await bitsOf(recorded[i]), expected[i], `encoder-mode GPU operation ${i} must be bit-identical to its self-submitted result`);
    assert.deepStrictEqual(await readGPU(shared), [1, 2, 3, 4, 5, 5], "Same-buffer copies stage correctly in a caller's encoder and run in queue order after the self-submitted copy");

    // Repeated encoder-mode operations on one encoder grow parameter blocks, not buffers per call.
    const out = compute.ndarray.empty("i16", { shape: [4, 3] }, { residency: "gpu" });
    const repeat = device.createCommandEncoder();
    compute.ndarray.cast(compute.ndarray.transpose(g), "i16", { out, encoder: repeat });
    compute.ndarray.copyInto(compute.ndarray.slice(shared, [[0, 5]]), compute.ndarray.slice(shared, [[1, 6]]), { encoder: repeat });
    const createBuffer = device.createBuffer;
    let created = 0;
    device.createBuffer = function (descriptor) { created++; return createBuffer.call(this, descriptor); };
    try { for (let i = 0; i < 32; i++) { compute.ndarray.cast(compute.ndarray.transpose(g), "i16", { out, encoder: repeat }); compute.ndarray.copyInto(compute.ndarray.slice(shared, [[0, 5]]), compute.ndarray.slice(shared, [[1, 6]]), { encoder: repeat }); } }
    finally { device.createBuffer = createBuffer; }
    const alignment = Math.max(device.limits.minStorageBufferOffsetAlignment, device.limits.minUniformBufferOffsetAlignment);
    let blocks = 0;
    for (let regions = 0, size = 4096; regions < 3 * 33; size = Math.min(2 * size, 65536)) { regions += Math.floor(size / alignment); blocks++; }
    assert.ok(created <= blocks, `96 encoder-mode gathers must reuse staging buffers and need at most ${blocks} parameter blocks (created ${created} buffers)`);
    device.queue.submit([repeat.finish()]);
    assert.deepStrictEqual(await bitsOf(out), expected[0], "repeated encoder-mode cast");
    g.destroy();
    shared.destroy();
    out.destroy();
    kernelIn.destroy();
}

// 20) Complex dtypes store interleaved [re, im] components and read and write scalars as tuples.
{
    const a = compute.ndarray.fromArray("c64", [2, 2], [1, -1, 2, -2, 3, -3, 4, -4]);
    assert.deepStrictEqual([a.bytesPerElement, a.numel, a.stridesBytes, a.wgslElementType], [8, 4, [16, 8], "vec2<f32>"]);
    assert.ok(a.data() instanceof Float32Array && a.data().length === 8, "c64 data() exposes interleaved f32 components");
    assert.deepStrictEqual(a.get(1, 0), [3, -3]);
    a.set(5, 0, 1);
    a.set([0.5, -0.25], 1, 1);
    assert.deepStrictEqual(Array.from(a.data()), [1, -1, 5, 0, 3, -3, 0.5, -0.25], "A number sets (value, +0) and a tuple sets both components");
    assert.deepStrictEqual(valuesOf(compute.ndarray.transpose(a)), [[1, -1], [3, -3], [5, 0], [0.5, -0.25]]);
    assert.throws(() => compute.ndarray.fromArray("c64", [2], [1, 2, 3]), /source length \(3\) must be >= 4/);
    assert.throws(() => a.set([1, 2, 3], 0, 0), /c64 values must be numbers or \[re, im\] tuples/);
    const real = compute.ndarray.zeros("f32", { shape: [2] });
    assert.throws(() => real.set([1, 2], 0), /a \[re, im\] value requires a complex dtype \(got f32\)/);
    const z = compute.ndarray.zeros("c128", { shape: [] });
    assert.deepStrictEqual([z.bytesPerElement, z.wgslElementType, z.data() instanceof Float64Array, z.get()], [16, null, true, [0, 0]]);
    z.set([Math.PI, -Math.E]);
    assert.deepStrictEqual(z.get(), [Math.PI, -Math.E]);
    const g = compute.ndarray.fromArray("c128", [2], [1, 2, 3, 4], { residency: "gpu" });
    assert.deepStrictEqual([g.byteLength, await readGPU(g)], [32, [[1, 2], [3, 4]]]);
    a.destroy();
    real.destroy();
    z.destroy();
    g.destroy();
}

// 21) real, imag, viewAsReal, and viewAsComplex view the interleaved components of the same storage.
{
    const a = compute.ndarray.fromArray("c64", [2, 3], [0, 10, 1, 11, 2, 12, 3, 13, 4, 14, 5, 15]);
    const re = compute.ndarray.real(a), im = compute.ndarray.imag(a);
    assert.deepStrictEqual([re.dtype, re.shape, re.stridesBytes, re.base === a, re.isContiguousC], ["f32", [2, 3], [24, 8], true, false]);
    assert.deepStrictEqual([valuesOf(re), valuesOf(im)], [[0, 1, 2, 3, 4, 5], [10, 11, 12, 13, 14, 15]]);
    assert.throws(() => re.data(), /contiguous row-major/);
    assert.strictEqual(compute.ndarray.imag(compute.ndarray.slice(a, [1, 2])).get(), 15, "imag() of the last element stays inside its base");
    im.set(-1, 1, 2);
    assert.deepStrictEqual(a.get(1, 2), [5, -1], "Writes through imag() reach the root");
    const pairs = compute.ndarray.viewAsReal(a);
    assert.deepStrictEqual([pairs.dtype, pairs.shape, pairs.stridesBytes, pairs.isContiguousC], ["f32", [2, 3, 2], [24, 8, 4], true]);
    assert.deepStrictEqual(Array.from(pairs.data()), [0, 10, 1, 11, 2, 12, 3, 13, 4, 14, 5, -1]);
    const back = compute.ndarray.viewAsComplex(pairs);
    assert.deepStrictEqual([back.dtype, back.shape, back.stridesBytes, back.base === a], ["c64", [2, 3], [24, 8], true]);
    back.set([7, 8], 0, 0);
    assert.deepStrictEqual(a.get(0, 0), [7, 8], "Writes through viewAsComplex() reach the root");
    const swapped = compute.ndarray.viewAsComplex(compute.ndarray.swapAxes(pairs, 0, 1));
    assert.deepStrictEqual([swapped.shape, swapped.stridesBytes, valuesOf(swapped)], [[3, 2], [8, 24], valuesOf(compute.ndarray.transpose(a))]);
    const unit = compute.ndarray.empty("f32", { shape: [1, 2], stridesBytes: [12, 4] });
    assert.deepStrictEqual(compute.ndarray.viewAsComplex(unit).stridesBytes, [8], "Size-1 axes get valid c64 strides");
    const odd = compute.ndarray.fromArray("f32", [3, 2], [1, 2, 3, 4, 5, 6]);
    assert.throws(() => compute.ndarray.real(odd), /compute\.ndarray\.real: expected a c64 or c128 array \(got f32\)/);
    assert.throws(() => compute.ndarray.imag(odd), /expected a c64 or c128 array/);
    assert.throws(() => compute.ndarray.viewAsReal(odd), /expected a c64 or c128 array/);
    assert.throws(() => compute.ndarray.viewAsComplex(a), /compute\.ndarray\.viewAsComplex: expected an f32 or f64 array \(got c64\)/);
    const ints = compute.ndarray.cast(odd, "i32");
    assert.throws(() => compute.ndarray.viewAsComplex(ints), /expected an f32 or f64 array \(got i32\)/);
    assert.throws(() => compute.ndarray.viewAsComplex(compute.ndarray.slice(odd, [0, 0])), /last axis must have length 2/);
    assert.throws(() => compute.ndarray.viewAsComplex(compute.ndarray.reshape(odd, [2, 3])), /last axis must have length 2/);
    assert.throws(() => compute.ndarray.viewAsComplex(compute.ndarray.transpose(compute.ndarray.slice(odd, [[0, 2]]))), /last axis must have a stride of 4 bytes \(got 8\); call compute\.ndarray\.contiguous\(\) first/);
    const gapped = compute.ndarray.empty("f32", { shape: [2, 2], stridesBytes: [12, 4] });
    assert.throws(() => compute.ndarray.viewAsComplex(gapped), /stride of axis 0 \(12 bytes\) must be a multiple of the c64 element size \(8 bytes\)/);
    assert.throws(() => compute.ndarray.viewAsComplex(compute.ndarray.reshape(compute.ndarray.slice(compute.ndarray.reshape(odd, [6]), [[1, 5]]), [2, 2])), /first element must be aligned to the c64 element size/);
    const g = compute.ndarray.fromArray("f64", [5, 2], Array.from({ length: 10 }, (_, i) => i), { residency: "gpu" });
    assert.throws(() => compute.ndarray.viewAsComplex(compute.ndarray.reshape(compute.ndarray.slice(compute.ndarray.reshape(g, [10]), [[1, 9]]), [4, 2])), /first element must be aligned to the c128 element size \(16 bytes\)/);
    const gc = compute.ndarray.viewAsComplex(g);
    assert.deepStrictEqual([gc.residency, gc.dtype, gc.shape, gc.base === g], ["gpu", "c128", [5], true]);
    assert.deepStrictEqual(await readGPU(compute.ndarray.imag(compute.ndarray.slice(gc, [[3, null]]))), [7, 9], "GPU imag() of trailing elements");
    assert.deepStrictEqual(await readGPU(compute.ndarray.real(compute.ndarray.flip(gc))), [8, 6, 4, 2, 0]);
    for (const residency of ["cpu", "gpu"]) {
        const z = compute.ndarray.fromArray("c128", [3], [1, 2, 3, 4, 5, 6], { residency });
        compute.ndarray.copyInto(compute.ndarray.real(z), compute.ndarray.imag(z));
        assert.deepStrictEqual((residency === "gpu") ? await readGPU(z) : valuesOf(z), [[2, 2], [4, 4], [6, 6]], `${residency} copies between real() and imag() of one root stage their overlapping source`);
        z.destroy();
    }
    a.destroy();
    assert.throws(() => back.get(0, 0), /destroyed/);
    unit.destroy();
    odd.destroy();
    ints.destroy();
    gapped.destroy();
    g.destroy();
    await assert.rejects(() => compute.ndarray.toCPU(compute.ndarray.real(gc)), /destroyed/);
}

// 22) Layout operations on c64 and c128 arrays are bit-identical on the CPU and GPU.
{
    for (const dtype of ["c64", "c128"]) {
        const values = [1.5, -0, NaN, Infinity, -2.25, 1e-40, 3, 0.1, -Infinity, 4, 2.5, -7];
        const a = compute.ndarray.fromArray(dtype, [2, 3], values);
        const g = compute.ndarray.toGPU(a);
        const [cpuT, gpuT] = [compute.ndarray.contiguous(compute.ndarray.transpose(a)), compute.ndarray.contiguous(compute.ndarray.transpose(g))];
        assert.deepStrictEqual(await bytesOf(gpuT), await bytesOf(cpuT), `${dtype} transposed contiguous()`);
        const round = (dtype === "c64") ? Math.fround : (v) => v;
        assert.deepStrictEqual(valuesOf(cpuT).flat(), [0, 1, 6, 7, 2, 3, 8, 9, 4, 5, 10, 11].map((i) => round(values[i])), `${dtype} transposed values`);
        const destinations = [compute.ndarray.zeros(dtype, { shape: [3, 3, 2] }), compute.ndarray.zeros(dtype, { shape: [3, 3, 2] }, { residency: "gpu" })];
        for (const [dst, src] of [[destinations[0], a], [destinations[1], g]]) compute.ndarray.copyInto(compute.ndarray.flip(compute.ndarray.transpose(dst, [0, 2, 1]), 2), compute.ndarray.flip(src, 0));
        assert.deepStrictEqual(await bytesOf(destinations[1]), await bytesOf(destinations[0]), `${dtype} broadcast copyInto() into a transposed, flipped destination`);
        const expected = valuesOf(compute.ndarray.flip(compute.ndarray.transpose(a)));
        assert.deepStrictEqual(valuesOf(destinations[0]), [...expected, ...expected, ...expected], `${dtype} broadcast copyInto() values`);
        for (const options of [{ width: [[1, 0], [0, 2]], value: [7, -7] }, { width: 1, value: 2 }, { width: [2, 1], mode: "reflect" }, { width: [[0, 1], [3, 0]], mode: "wrap" }]) {
            const [cpuPad, gpuPad] = [compute.ndarray.pad(a, options), compute.ndarray.pad(g, options)];
            assert.deepStrictEqual(await bytesOf(gpuPad), await bytesOf(cpuPad), `${dtype} pad(${JSON.stringify(options)})`);
            if (options.value !== undefined) assert.deepStrictEqual(cpuPad.get(0, 0), (typeof options.value === "number") ? [options.value, 0] : options.value, `${dtype} constant pad value`);
            cpuPad.destroy();
            gpuPad.destroy();
        }
        assert.throws(() => compute.ndarray.pad(a, { width: 1, value: [1, 2, 3] }), new RegExp(`a ${dtype} value must be a number or a \\[re, im\\] tuple`));
        assert.throws(() => compute.ndarray.pad(compute.ndarray.real(a), { width: 1, value: [1, 2] }), /a \[re, im\] value requires a complex dtype/);
        for (const x of [a, g, cpuT, gpuT, ...destinations]) x.destroy();
    }
}

// 23) Casts into complex dtypes are bit-exact and identical on the CPU and GPU, and casts out of them are rejected.
{
    const bits = [0x7FA00001, 0xFFC12345, 0x80000000, 0x00000001, 0x7F7FFFFF, 0x3F800001];
    const f32 = fromBits("f32", [6], bits);
    const f64 = compute.ndarray.fromArray("f64", [6], [1 + 2 ** -24, 1 + 3 * 2 ** -24, 3.5e38, 1.5 * 2 ** -149, -0, NaN]);
    const i32 = compute.ndarray.fromArray("i32", [6], [16777217, -16777219, 2147483647, -2147483648, 0, 7]);
    const u8 = compute.ndarray.fromArray("u8", [6], [0, 1, 127, 128, 254, 255]);
    const c64 = compute.ndarray.fromArray("c64", [3], [1.5, -2.5, NaN, Infinity, 1e-40, -0]);
    const c128 = compute.ndarray.fromArray("c128", [3], [1 + 2 ** -24, -(1 + 3 * 2 ** -24), 3.5e38, 1.5 * 2 ** -149, NaN, -0]);
    const sources = { f32, f64, i32, u8, c64, c128 };
    const gpu = Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, compute.ndarray.toGPU(v)]));
    for (const [from, to] of [["f32", "c64"], ["f64", "c64"], ["i32", "c64"], ["u8", "c64"], ["c128", "c64"], ["f32", "c128"], ["f64", "c128"], ["c64", "c128"]]) {
        const cpu = compute.ndarray.cast(sources[from], to);
        const fromGPU = compute.ndarray.cast(gpu[from], to);
        assert.deepStrictEqual(await bytesOf(fromGPU), await bytesOf(cpu), `${from} -> ${to} casts must be bit-identical on the CPU and GPU`);
        const re = compute.ndarray.real(cpu), im = compute.ndarray.imag(cpu);
        if (from[0] !== "c") assert.ok(valuesOf(im).every((v) => Object.is(v, 0)), `${from} -> ${to} writes +0 imaginary parts`);
        if (from === "f32") {
            const dense = compute.ndarray.contiguous(re);
            const data = dense.data();
            assert.deepStrictEqual(Array.from(new Uint32Array(data.buffer, data.byteOffset, 1)), (to === "c64") ? [0x7FA00001] : [0x20000000], `${from} -> ${to} keeps the NaN payload`);
            dense.destroy();
        }
        cpu.destroy();
        fromGPU.destroy();
    }
    const widened = compute.ndarray.cast(f32, "f64"), widenedGPU = compute.ndarray.cast(gpu.f32, "f64");
    assert.deepStrictEqual(await bytesOf(widenedGPU), await bytesOf(widened), "f32 -> f64 casts must be bit-identical on the CPU and GPU");
    const wideData = widened.data();
    assert.deepStrictEqual(Array.from(new Uint32Array(wideData.buffer, wideData.byteOffset, 2)), [0x20000000, 0x7FFC0000], "f32 -> f64 casts keep a signaling NaN's payload and set its quiet bit");
    const intC64 = compute.ndarray.cast(i32, "c64"), narrowed = compute.ndarray.cast(c128, "c64"), intC128 = compute.ndarray.cast(i32, "c128");
    assert.deepStrictEqual(valuesOf(compute.ndarray.real(intC64)), Array.from(new Float32Array([16777217, -16777219, 2147483647, -2147483648, 0, 7])), "Integer -> c64 rounds like integer -> f32");
    assert.deepStrictEqual(valuesOf(narrowed).flat(), Array.from(new Float32Array([1 + 2 ** -24, -(1 + 3 * 2 ** -24), 3.5e38, 1.5 * 2 ** -149, NaN, -0])), "c128 -> c64 rounds each component to nearest even");
    assert.deepStrictEqual(valuesOf(intC128).map((v) => v[0]), [16777217, -16777219, 2147483647, -2147483648, 0, 7], "Integer -> c128 is exact on the CPU");
    const into = compute.ndarray.zeros("c64", { shape: [2, 3] });
    const u8_2 = compute.ndarray.fromArray("u8", [3], [1, 2, 3]);
    compute.ndarray.copyInto(into, u8_2);
    assert.deepStrictEqual(valuesOf(into), [[1, 0], [2, 0], [3, 0], [1, 0], [2, 0], [3, 0]], "copyInto() broadcasts and casts real sources into complex destinations");
    for (const [label, array] of [["cpu", c64], ["gpu", gpu.c64]]) {
        for (const to of ["f32", "f64", "i32", "u8"]) assert.throws(() => compute.ndarray.cast(array, to), /casting c64 to .* would discard imaginary parts; take compute\.ndarray\.real\(\) or compute\.ndarray\.imag\(\) first, then cast\(\)/, `${label} c64 -> ${to}`);
        assert.throws(() => compute.ndarray.copyInto(compute.ndarray.real(array), array), /would discard imaginary parts/, `${label} copyInto() c64 -> f32`);
    }
    assert.throws(() => compute.ndarray.cast(c128, "f64"), /casting c128 to f64 would discard imaginary parts/);
    assert.throws(() => compute.ndarray.cast(gpu.i32, "c128"), /compute\.ndarray\.cast: c128 <-> integer casts are not supported on the GPU; cast through f32 or c64, or use a CPU array/);
    const wideGPU = compute.ndarray.zeros("c128", { shape: [6] }, { residency: "gpu" });
    assert.throws(() => compute.ndarray.copyInto(wideGPU, gpu.u8), /c128 <-> integer casts are not supported on the GPU/);
    for (const x of [f32, f64, i32, u8, c64, c128, into, u8_2, widened, widenedGPU, intC64, narrowed, intC128, wideGPU, ...Object.values(gpu)]) x.destroy();
}

// 24) c128 GPU arrays are lossless storage that round-trips, views, and moves without GPU arithmetic.
{
    const values = [Math.PI, -Math.E, 1 + Number.EPSILON, Number.MIN_VALUE, -0, 1e300];
    const a = compute.ndarray.fromArray("c128", [3], values);
    const g = compute.ndarray.toGPU(a);
    const back = await compute.ndarray.toCPU(g);
    assert.deepStrictEqual([back.dtype, Array.from(back.data())], ["c128", values]);
    const flipped = compute.ndarray.contiguous(compute.ndarray.flip(g));
    assert.deepStrictEqual(await readGPU(flipped), [[-0, 1e300], [1 + Number.EPSILON, Number.MIN_VALUE], [Math.PI, -Math.E]]);
    const broadcast = compute.ndarray.contiguous(compute.ndarray.broadcastTo(compute.ndarray.slice(g, [[2, 3]]), [2, 1]));
    assert.deepStrictEqual(await readGPU(broadcast), [[-0, 1e300], [-0, 1e300]]);
    assert.deepStrictEqual(await readGPU(compute.ndarray.viewAsReal(compute.ndarray.slice(g, [1]))), [1 + Number.EPSILON, Number.MIN_VALUE]);
    assert.throws(() => compute.kernels.add(g, g), /compute\.kernels\.add: a has dtype c128, but compute\.kernels\.add supports f32, u32, and c64; convert it with compute\.ndarray\.cast\(\) first/);
    a.destroy();
    g.destroy();
    back.destroy();
    flipped.destroy();
    broadcast.destroy();
}

// 25) normalize and resize reject complex inputs and outputs before validating their other parameters.
{
    const c = compute.ndarray.zeros("c64", { shape: [2, 2] });
    const r = compute.ndarray.zeros("f32", { shape: [2, 2] }, { residency: "gpu" });
    assert.throws(() => compute.ndarray.normalize(c, { scale: 2 }), /compute\.ndarray\.normalize: complex dtypes \(c64, c128\) are not supported$/);
    assert.throws(() => compute.ndarray.normalize(r, { mean: [1, 2, 3], std: 1, dtype: "c128" }), /compute\.ndarray\.normalize: complex dtypes \(c64, c128\) are not supported$/);
    assert.throws(() => compute.ndarray.resize(c, { axes: [0, 1], size: [3, 3] }), /compute\.ndarray\.resize: complex dtypes \(c64, c128\) are not supported yet/);
    assert.throws(() => compute.ndarray.resize(r, { axes: [0, 0], size: [3, 3], dtype: "c64" }), /compute\.ndarray\.resize: complex dtypes \(c64, c128\) are not supported yet/);
    c.destroy();
    r.destroy();
}

// 26) Cleanup releases the shared compute context before its browser GPU device.
{
    compute.destroy();
    await destroyTestDevice(device);
}
