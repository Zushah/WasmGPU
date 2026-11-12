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

// 18) resize reproduces PyTorch's bilinear, bicubic, antialiased, and nearest-exact conventions on CPU and GPU.
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

    // Keys cubic convolution and antialiasing: torch.nn.functional.interpolate(x[None, None], ...) in float64 (PyTorch 2.15.0).
    const y = compute.ndarray.fromArray("f64", [6, 7], [-5, -2, 1, 4, -4, -1, 2, 2.25, 5.25, -2.75, 0.25, 3.25, -4.75, -1.75, -1.5, 1.5, 4.5, -3.5, -0.5, 2.5, 5.5, 5.75, -2.25, 0.75, 3.75, -4.25, -1.25, 1.75, 2, 5, -3, 0, 3, 6, -2, -1.75, 1.25, 4.25, -3.75, -0.75, 2.25, 5.25]);
    const gy = compute.ndarray.toGPU(compute.ndarray.cast(y, "f32"));
    const pil = { antialias: true, cubicCoefficient: -0.5, boundary: "renormalize" };
    const cases = [
        // mode="bicubic", align_corners=False
        [x, g, { size: [4, 5], method: "cubic" }, [0.23659374999999988, 0.3255781249999993, 0.5234375, 0.8626249999999995, 1.0971250000000001, 2.3376874999999986, 3.2169062499999934, 5.171875, 8.523249999999996, 10.840250000000003, 5.798312499999996, 7.979093749999984, 12.828125, 21.140749999999986, 26.887750000000004, 7.899406249999996, 10.87042187499998, 17.4765625, 28.801374999999982, 36.63087500000001]],
        // mode="bicubic", align_corners=True
        [x, g, { size: [4, 5], method: "cubic", alignCorners: true }, [1, 1.3125, 2, 3.09375, 4, 3.203703703703705, 4.2048611111111125, 6.40740740740741, 9.911458333333337, 12.81481481481482, 5.796296296296296, 7.607638888888888, 11.592592592592592, 17.932291666666664, 23.185185185185183, 8, 10.5, 16, 24.75, 32]],
        // mode="bilinear", antialias=True
        [y, gy, { size: [3, 4], method: "linear", antialias: true, boundary: "renormalize" }, [-0.04591836734693887, 0.6357142857142855, -0.2557142857142858, -0.45408163265306134, 1.6011904761904763, 0.8849999999999996, -0.35999999999999993, 1.3988095238095237, 1.5272108843537415, 0.5057142857142857, 0.5571428571428572, 2.316326530612245]],
        // mode="bicubic", antialias=True (shrinking, mixed shrinking and growing, and growing)
        [y, gy, { size: [3, 4], method: "cubic", ...pil }, [-0.21213034140727394, 0.7781414634230026, -0.2687336706003044, -0.7522300722759209, 1.8011447399143412, 0.9072768685702122, -0.608531371573258, 1.577350579208486, 1.674737104161587, 0.3228722245381452, 0.5403854038540389, 2.579408462177283]],
        [y, gy, { size: [2, 9], method: "cubic", ...pil }, [-0.3500856431018373, 0.9468984962406017, 1.139276947512815, 0.5280394917334489, 0.769736842105263, -0.2727330156667386, -1.3686105696339605, -0.5808270676691739, 1.6617486764247904, 1.7716054188726251, 1.8078007518796988, 1.4101418670132115, 0.5227330156667387, -0.519736842105263, -0.5407100570355938, 1.5140693812721093, 2.6527255639097747, 1.779391155403301]],
        [x, g, { size: [4, 5], method: "cubic", ...pil }, [0.35349611542730275, 0.48222124670763805, 0.7647058823529409, 1.2783143107989463, 1.5871254162042172, 2.265094339622641, 3.089925373134328, 4.9, 8.191044776119405, 10.169811320754716, 6.055660377358489, 8.260820895522386, 13.1, 21.89850746268657, 27.188679245283016, 7.9672586015538265, 10.868525021949075, 17.235294117647058, 28.811237928007028, 35.771365149833514]],
        // WasmGPU semantics without an external reference: antialiased cubic with edge boundaries and a = -0.75, and cubic constant and reflect boundaries.
        [y, gy, { size: [3, 4], method: "cubic", antialias: true }, [-0.5900795351324429, 1.0259885338889903, -0.4138512730728705, -0.5895200605075008, 2.1802194027712667, 0.7502216434582966, -0.5687136386843749, 1.5005623233773508, 1.58731217564919, 0.3458480926264374, 0.38310126656889043, 2.632468665758321]],
        [x, g, { size: [4, 5], method: "cubic", boundary: "constant", value: -2 }, [-0.69978125, -0.23853124999999986, -0.3828125, -0.1549999999999998, -0.6027499999999999, 2.0438437499999997, 4.54665625, 6.2265625, 11.6096875, 10.248375, 5.189031249999999, 10.38771875, 14.8671875, 27.7158125, 25.317625, 4.316593749999999, 9.07759375, 13.3984375, 25.53325, 23.43175]],
        [x, g, { size: [4, 5], method: "cubic", boundary: "reflect" }, [2.16075, 2.3785000000000003, 4.1875, 7.353249999999999, 8.090250000000001, 2.16075, 2.3785000000000003, 4.1875, 7.353249999999999, 8.090250000000001, 7.12725, 7.845500000000001, 13.8125, 24.254749999999998, 26.685750000000006, 7.12725, 7.845500000000001, 13.8125, 24.254749999999998, 26.685750000000006]]
    ];
    for (const [cpu, gpu, options, expected] of cases) {
        arraysApproxEqual(Array.from(compute.ndarray.resize(cpu, { axes: [0, 1], ...options }).data()), expected, 1e-12, `CPU resize ${JSON.stringify(options)}`);
        arraysApproxEqual(await readGPU(compute.ndarray.resize(gpu, { axes: [0, 1], ...options })), expected, 1e-5, `GPU resize ${JSON.stringify(options)}`);
    }

    for (const a of [y, gy]) assert.deepStrictEqual(compute.ndarray.resize(a, { axes: [0, 1], size: [3, 0], method: "cubic", antialias: true }).shape, [3, 0], `${a.residency} antialiased resizing to an empty axis`);

    // Exact samples pass through bit-exactly, cubic overshoot saturates integer outputs, and float outputs are not clamped.
    const exact = compute.ndarray.fromArray("f32", [1, 4], [Infinity, -0, 2, -Infinity]);
    const same = { axes: [0, 1], size: [1, 4], method: "cubic" };
    for (const values of [Array.from(compute.ndarray.resize(exact, same).data()), await readGPU(compute.ndarray.resize(compute.ndarray.toGPU(exact), same))]) assert.ok(values.length === 4 && values.every((v, i) => Object.is(v, [Infinity, -0, 2, -Infinity][i])), `Same-size cubic resizes must reproduce samples exactly (got ${values})`);
    const ramp = compute.ndarray.fromArray("f64", [1, 3], [Math.PI, -Math.E, 1 + 2 ** -52]);
    const corner = Array.from(compute.ndarray.resize(ramp, { axes: [0, 1], size: [1, 5], method: "cubic", alignCorners: true }).data());
    assert.deepStrictEqual([corner[0], corner[2], corner[4]], [Math.PI, -Math.E, 1 + 2 ** -52], "Corner-aligned cubic outputs on samples reproduce them exactly");
    const step = compute.ndarray.fromArray("u8", [1, 6], [0, 0, 0, 255, 255, 255]);
    const overshoot = { axes: [0, 1], size: [1, 8], method: "cubic" };
    assert.deepStrictEqual(Array.from(compute.ndarray.resize(step, overshoot).data()), [0, 0, 0, 27, 228, 255, 255, 255], "Cubic overshoot saturates u8 outputs");
    assert.deepStrictEqual(await readGPU(compute.ndarray.resize(compute.ndarray.toGPU(step), overshoot)), [0, 0, 0, 27, 228, 255, 255, 255]);
    assert.deepStrictEqual(Array.from(compute.ndarray.resize(step, { ...overshoot, dtype: "f64" }).data()), [0, 0, -16.80908203125, 26.6455078125, 228.3544921875, 271.80908203125, 255, 255], "Float outputs keep cubic overshoot");

    // Resizing is separable: one call equals resizing x and then y, bitwise on the CPU, including the two-pass path of wide filters.
    const field = compute.ndarray.fromArray("f64", [64, 64], Array.from({ length: 4096 }, (_, i) => Math.sin(0.37 * i) * 10 + (i % 7)));
    const fieldGPU = compute.ndarray.toGPU(compute.ndarray.cast(field, "f32"));
    for (const [a, ga, size, options] of [[x, g, [4, 5], { method: "cubic", boundary: "constant", value: 3 }], [y, gy, [4, 9], { method: "linear", boundary: "reflect" }], [field, fieldGPU, [5, 5], { method: "cubic", antialias: true }]]) {
        const once = Array.from(compute.ndarray.resize(a, { axes: [0, 1], size, ...options }).data());
        const twice = Array.from(compute.ndarray.resize(compute.ndarray.resize(a, { axes: [0, 1], size: [a.shape[0], size[1]], ...options }), { axes: [0, 1], size, ...options }).data());
        assert.ok(once.every((v, i) => Object.is(v, twice[i])), `CPU resize ${JSON.stringify(options)} must equal its separable composition bitwise`);
        arraysApproxEqual(await readGPU(compute.ndarray.resize(ga, { axes: [0, 1], size, ...options })), once, 1e-5, `GPU resize ${JSON.stringify(options)}`);
    }

    // Complex arrays resize componentwise with real weights; real inputs may produce complex outputs with +0 imaginary parts.
    const c = compute.ndarray.fromArray("c128", [2, 3], [1, -6, 2.5, 5, -3, 4, 4, -3, 5, 2, -6, 1]);
    const complexOptions = { axes: [0, 1], size: [3, 4], method: "cubic", boundary: "constant" };
    const both = valuesOf(compute.ndarray.resize(c, { ...complexOptions, value: [1, -2] }));
    const parts = [valuesOf(compute.ndarray.resize(compute.ndarray.real(c), { ...complexOptions, value: 1 })), valuesOf(compute.ndarray.resize(compute.ndarray.imag(c), { ...complexOptions, value: -2 }))];
    assert.ok(both.every(([re, im], i) => Object.is(re, parts[0][i]) && Object.is(im, parts[1][i])), "c128 resizing equals separate resizes of its real and imaginary parts");
    const c64 = compute.ndarray.cast(c, "c64"), c64GPU = compute.ndarray.toGPU(c64);
    arraysApproxEqual((await readGPU(compute.ndarray.resize(c64GPU, { ...complexOptions, value: [1, -2] }))).flat(), valuesOf(compute.ndarray.resize(c64, { ...complexOptions, value: [1, -2] })).flat(), 1e-5, "GPU c64 resize must stay within f32 tolerance");
    const promoted = [valuesOf(compute.ndarray.resize(exact, { axes: [0, 1], size: [2, 3], dtype: "c64" })), await readGPU(compute.ndarray.resize(compute.ndarray.toGPU(compute.ndarray.slice(exact, [null, [1, 3]])), { axes: [0, 1], size: [2, 3], method: "cubic", dtype: "c64" }))];
    assert.ok(promoted.every((values) => values.every(([, im]) => Object.is(im, 0))), "Real inputs resized into c64 have +0 imaginary parts on the CPU and GPU");
    const nearestOptions = { axes: [0, 1], size: [3, 5], method: "nearest" };
    assert.deepStrictEqual(await bytesOf(compute.ndarray.resize(c64GPU, nearestOptions)), await bytesOf(compute.ndarray.resize(c64, nearestOptions)), "c64 nearest resizing is bit-identical on the CPU and GPU");
    const wide = compute.ndarray.fromArray("c128", [2, 2], [Math.PI, -Math.E, 1e300, -0, NaN, Infinity, 1 + 2 ** -52, Number.MIN_VALUE]);
    for (const a of [wide, ramp]) assert.deepStrictEqual(await bytesOf(compute.ndarray.resize(compute.ndarray.toGPU(a), nearestOptions)), await bytesOf(compute.ndarray.resize(a, nearestOptions)), `GPU ${a.dtype} nearest resizing is a lossless gather`);
    assert.throws(() => compute.ndarray.resize(c64, { axes: [0, 1], size: [3, 3], dtype: "f32" }), /compute\.ndarray\.resize: resizing c64 into f32 would discard imaginary parts; resize compute\.ndarray\.real\(\) or compute\.ndarray\.imag\(\) views instead/);
    assert.throws(() => compute.ndarray.resize(compute.ndarray.toGPU(wide), { axes: [0, 1], size: [3, 3] }), /GPU linear and cubic resizing computes in f32 and does not support f64 or c128 inputs or outputs; use method "nearest" or a CPU array/);
    assert.throws(() => compute.ndarray.resize(compute.ndarray.toGPU(step), { ...nearestOptions, dtype: "c128" }), /compute\.ndarray\.resize: c128 <-> integer casts are not supported on the GPU/, "GPU nearest resizing follows the GPU cast dtype rules");

    // Validation follows the documented order and messages.
    const invalid = [
        [{ method: "bicubic" }, /method must be "nearest", "linear", or "cubic" \(got bicubic\)/],
        [{ method: "nearest", alignCorners: true }, /alignCorners applies only to methods "linear" and "cubic"/],
        [{ antialias: 1 }, /antialias must be a boolean/],
        [{ method: "nearest", antialias: true }, /antialias applies only to methods "linear" and "cubic"/],
        [{ antialias: true, alignCorners: true }, /antialias cannot be combined with alignCorners/],
        [{ cubicCoefficient: -0.5 }, /cubicCoefficient applies only to method "cubic"/],
        [{ method: "cubic", cubicCoefficient: NaN }, /cubicCoefficient must be a finite number \(got NaN\)/],
        [{ boundary: "clamp" }, /boundary must be "edge", "constant", "reflect", "symmetric", "wrap", or "renormalize" \(got clamp\)/],
        [{ boundary: "renormalize", value: 1 }, /value applies only to boundary "constant"/],
        [{ boundary: "constant", value: [1, 2] }, /a \[re, im\] value requires a complex input \(got f64\)/],
        [{ boundary: "constant", value: "1" }, /value must be a number/]
    ];
    for (const [options, message] of invalid) assert.throws(() => compute.ndarray.resize(x, { axes: [0, 1], size: [3, 3], ...options }), message, JSON.stringify(options));
    assert.throws(() => compute.ndarray.resize(c, { axes: [0, 1], size: [3, 3], boundary: "constant", value: [1, 2, 3] }), /a c128 value must be a number or a \[re, im\] tuple of numbers/);
    for (const a of [x, g, y, gy, exact, ramp, step, field, fieldGPU, c, c64, c64GPU, wide]) a.destroy();
    hwc.destroy();
    infinite.destroy();
}

// 19) GPU operations recorded into a caller's encoder match self-submitted results and reuse scratch memory.
{
    const bitsOf = async (a) => { const cpu = await compute.ndarray.toCPU(a); try { return Array.from(new Uint8Array(cpu.data().buffer, cpu.data().byteOffset, cpu.data().byteLength)); } finally { cpu.destroy(); } };
    const g = compute.ndarray.fromArray("f32", [3, 4], [0.5, -1.5, 2.5, 300.7, -7, 8.25, NaN, Infinity, 1e-3, -0, 42, -42], { residency: "gpu" });
    const field = compute.ndarray.fromArray("f32", [32, 32], Array.from({ length: 1024 }, (_, i) => Math.cos(0.11 * i) * (i % 13)), { residency: "gpu" });
    const volume = compute.ndarray.fromArray("f32", [12, 10, 10], Array.from({ length: 1200 }, (_, i) => Math.sin(0.23 * i) * (i % 9)), { residency: "gpu" });
    const ops = [
        (options) => compute.ndarray.cast(compute.ndarray.transpose(g), "i16", options),
        (options) => compute.ndarray.pad(g, { width: [[1, 0], [2, 1]], mode: "reflect", ...options }),
        (options) => compute.ndarray.resize(g, { axes: [0, 1], size: [5, 7], ...options }),
        // Antialiased cubic 32 -> 5 and 32 -> 3 gathers up to 26 x 32 taps per output, so it runs as two passes through a scratch temporary.
        (options) => compute.ndarray.resize(field, { axes: [0, 1], size: [5, 3], method: "cubic", antialias: true, ...options }),
        (options) => compute.ndarray.resize(volume, { axes: [0, 1, 2], size: [5, 6, 7], ...options }),
        // Antialiased cubic shrinking along three axes runs as three passes through two ping-pong scratch temporaries.
        (options) => compute.ndarray.resample(volume, { axes: [0, 1, 2], size: [3, 2, 2], scale: [4, 5, 5], offset: 1.5, method: "cubic", antialias: true, ...options })
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
    field.destroy();
    volume.destroy();
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

// 25) normalize rejects complex inputs and outputs before validating its other parameters, and resize rejects complex-to-real outputs.
{
    const c = compute.ndarray.zeros("c64", { shape: [2, 2] });
    const r = compute.ndarray.zeros("f32", { shape: [2, 2] }, { residency: "gpu" });
    assert.throws(() => compute.ndarray.normalize(c, { scale: 2 }), /compute\.ndarray\.normalize: complex dtypes \(c64, c128\) are not supported$/);
    assert.throws(() => compute.ndarray.normalize(r, { mean: [1, 2, 3], std: 1, dtype: "c128" }), /compute\.ndarray\.normalize: complex dtypes \(c64, c128\) are not supported$/);
    assert.throws(() => compute.ndarray.normalize(c, { method: "zscore", axes: 7, range: [1, 0], nan: "skip" }), /compute\.ndarray\.normalize: complex dtypes \(c64, c128\) are not supported$/);
    assert.throws(() => compute.ndarray.normalize(r, { method: "percentile", dtype: "c64" }), /compute\.ndarray\.normalize: complex dtypes \(c64, c128\) are not supported$/);
    const gc = compute.ndarray.toGPU(c);
    assert.throws(() => compute.ndarray.resize(c, { axes: [0, 1], size: [3, 3], dtype: "u8" }), /compute\.ndarray\.resize: resizing c64 into u8 would discard imaginary parts/);
    assert.throws(() => compute.ndarray.resize(gc, { axes: [0, 1], size: [3, 3], method: "nearest", dtype: "f64" }), /compute\.ndarray\.resize: resizing c64 into f64 would discard imaginary parts/);
    c.destroy();
    r.destroy();
    gc.destroy();
}

// 26) resize interpolates along any number of axes in a fixed summation order, bitwise-invariant to the CPU pass grouping.
{
    const { arraysApproxEqual } = createApproxHelpers(1e-12);
    const sameBits = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    const v = compute.ndarray.fromArray("f64", [2, 2, 3], [1, 2, 4, 8, 16, 32, 3, -5, 7, 0.5, 9, -2]);
    const gv = compute.ndarray.toGPU(compute.ndarray.cast(v, "f32"));
    // torch.nn.functional.interpolate(x[None, None], size=(3, 3, 4), mode="trilinear", align_corners=False) in float64 (PyTorch 2.14.0)
    const trilinear = [1, 1.625, 2.75, 4, 4.5, 7.312499999999999, 12.374999999999998, 18, 8, 13, 22, 32, 1.9999999999999998, -0.1874999999999999, 1.125, 5.5, 3.125, 4.609374999999999, 7.281249999999998, 10.25, 4.25, 9.40625, 13.4375, 15, 3, -2, -0.5, 7, 1.75, 1.9062499999999996, 2.1874999999999996, 2.5, 0.5, 5.8125, 4.875, -2];
    // torch.nn.functional.interpolate(x[None, None], size=(3, 3, 4), mode="trilinear", align_corners=True) in float64 (PyTorch 2.14.0)
    const corners = [1, 1.6666666666666665, 2.6666666666666665, 4, 4.5, 7.499999999999999, 12, 18, 8, 13.333333333333332, 21.333333333333332, 32, 2, -0.33333333333333326, 0.8333333333333329, 5.5, 3.125, 4.708333333333333, 7.083333333333333, 10.25, 4.25, 9.75, 13.333333333333332, 15, 3, -2.333333333333333, -1.0000000000000007, 7, 1.75, 1.916666666666667, 2.1666666666666665, 2.5, 0.5, 6.166666666666667, 5.333333333333334, -2];
    for (const [options, expected] of [[{}, trilinear], [{ alignCorners: true }, corners]]) {
        arraysApproxEqual(Array.from(compute.ndarray.resize(v, { axes: [0, 1, 2], size: [3, 3, 4], ...options }).data()), expected, 1e-12, `CPU trilinear ${JSON.stringify(options)}`);
        arraysApproxEqual(await readGPU(compute.ndarray.resize(gv, { axes: [0, 1, 2], size: [3, 3, 4], ...options })), expected, 1e-5, `GPU trilinear ${JSON.stringify(options)}`);
    }

    // One axis equals two axes with an unchanged second axis, and the listing order of the axes does not matter.
    const field = compute.ndarray.fromArray("f32", [5, 6, 7], Array.from({ length: 210 }, (_, i) => Math.sin(0.7 * i) * 9 + (i % 5)));
    const fieldGPU = compute.ndarray.toGPU(field);
    for (const a of [field, fieldGPU]) for (const method of ["nearest", "linear", "cubic"]) {
        const one = await bytesOf(compute.ndarray.resize(a, { axes: 1, size: 11, method }));
        assert.ok(sameBits(one, await bytesOf(compute.ndarray.resize(a, { axes: [1, 2], size: [11, 7], method }))), `${a.residency} ${method}: a 1-axis resize equals a 2-axis resize with an unchanged axis`);
        const ordered = await bytesOf(compute.ndarray.resize(a, { axes: [0, 1, 2], size: [3, 9, 4], method }));
        assert.ok(sameBits(ordered, await bytesOf(compute.ndarray.resize(a, { axes: [2, 0, -2], size: [4, 3, 9], method }))), `${a.residency} ${method}: axis order does not matter`);
    }

    // An affine function of the coordinates is reproduced wherever every axis interpolates between samples.
    const f = (z, y, x) => 2 * z - 3 * y + 0.5 * x + 1;
    const ramp = compute.ndarray.fromArray("f64", [4, 5, 6], Array.from({ length: 120 }, (_, i) => f(Math.floor(i / 30), Math.floor(i / 6) % 5, i % 6)));
    const size = [7, 9, 11], at = (d, k) => (d + 0.5) * ramp.shape[k] / size[k] - 0.5;
    const results = [Array.from(compute.ndarray.resize(ramp, { axes: [0, 1, 2], size }).data()), await readGPU(compute.ndarray.resize(compute.ndarray.toGPU(compute.ndarray.cast(ramp, "f32")), { axes: [0, 1, 2], size }))];
    for (const [values, tolerance] of [[results[0], 1e-12], [results[1], 1e-4]]) {
        for (let e = 0; e < 7 * 9 * 11; e++) {
            const c = [Math.floor(e / 99), Math.floor(e / 11) % 9, e % 11].map(at);
            if (c.every((x, k) => x >= 0 && x <= ramp.shape[k] - 1)) assert.ok(Math.abs(values[e] - f(...c)) <= tolerance * 30, `affine interior value ${e}: ${values[e]} vs ${f(...c)}`);
        }
    }

    // CPU results equal successive single-axis resizes from the highest axis down, bitwise, for single- and multi-pass plans.
    const volume = compute.ndarray.fromArray("f64", [24, 20, 18], Array.from({ length: 8640 }, (_, i) => Math.cos(0.013 * i) * 50 + (i % 11)));
    const volumeGPU = compute.ndarray.toGPU(compute.ndarray.cast(volume, "f32"));
    // The planner runs the constant-boundary cubic case as passes {1, 2} and {0}, antialiased cubic shrinking (10 to 26 taps per axis) as three
    // one-axis passes, and the linear case as a single pass over three levels.
    for (const [shape, options] of [[[30, 7, 25], { method: "cubic", boundary: "constant", value: -1 }], [[3, 4, 5], { method: "cubic", antialias: true }], [[9, 31, 4], { method: "linear", boundary: ["edge", "wrap", "reflect"] }]]) {
        const once = compute.ndarray.resize(volume, { axes: [0, 1, 2], size: shape, ...options });
        let composed = volume;
        for (const axis of [2, 1, 0]) composed = compute.ndarray.resize(composed, { ...options, axes: axis, size: shape[axis], boundary: Array.isArray(options.boundary) ? options.boundary[axis] : options.boundary, dtype: "f64" });
        assert.ok(sameBits(await bytesOf(once), await bytesOf(composed)), `CPU ${JSON.stringify(options)} must equal its single-axis composition bitwise`);
        arraysApproxEqual(await readGPU(compute.ndarray.resize(volumeGPU, { axes: [0, 1, 2], size: shape, ...options })), Array.from(once.data()), 1e-4, `GPU ${JSON.stringify(options)}`);
    }
    const perAxis = Array.from(compute.ndarray.resize(v, { axes: [1, 2], size: [3, 5], method: "cubic", boundary: ["edge", "wrap"] }).data());
    const wrapped = compute.ndarray.resize(compute.ndarray.resize(v, { axes: 2, size: 5, method: "cubic", boundary: "wrap" }), { axes: 1, size: 3, method: "cubic", boundary: "edge" });
    assert.ok(perAxis.every((x, i) => Object.is(x, wrapped.data()[i])), "Per-axis boundaries apply to their own axes");

    // Nearest resizing along three and four axes is a bit-identical gather on the CPU and GPU, including f64 GPU gathers.
    const wide = compute.ndarray.fromArray("f64", [3, 4, 2, 5], Array.from({ length: 120 }, (_, i) => (i % 3 === 0) ? NaN : Math.PI * i - 1e300 * (i % 7 === 1)));
    for (const [a, options] of [[wide, { axes: [0, 2, 3], size: [5, 3, 7] }], [wide, { axes: [0, 1, 2, 3], size: [2, 7, 3, 4] }], [compute.ndarray.cast(field, "i16"), { axes: [0, 1, 2], size: [8, 3, 9], dtype: "f32" }]]) {
        const cpu = compute.ndarray.resize(a, { ...options, method: "nearest" });
        assert.deepStrictEqual(await bytesOf(compute.ndarray.resize(compute.ndarray.toGPU(a), { ...options, method: "nearest" })), await bytesOf(cpu), `GPU nearest ${JSON.stringify(options)} must be bit-identical`);
    }
    const four = compute.ndarray.resize(wide, { axes: [0, 1, 2, 3], size: [5, 2, 3, 4], method: "linear", boundary: "reflect" });
    let fourComposed = wide;
    for (const [axis, n] of [[3, 4], [2, 3], [1, 2], [0, 5]]) fourComposed = compute.ndarray.resize(fourComposed, { axes: axis, size: n, method: "linear", boundary: "reflect" });
    assert.ok(sameBits(await bytesOf(four), await bytesOf(fourComposed)), "A 4-axis CPU resize needs more than one pass (the planner picks {3}, {1, 2}, {0}) and equals its composition bitwise");

    // The CPU intermediate budget changes only the grouping: with no budget, at most three levels run in one pass and a 4-axis resize keeps its
    // intermediates as small as possible, bitwise identical to the default plans.
    const frugal = new Compute(device, device.queue, { ndarray: { maxCPUIntermediateBytes: 0 } });
    for (const [a, options] of [[volume, { axes: [0, 1, 2], size: [30, 7, 25], method: "cubic" }], [wide, { axes: [0, 1, 2, 3], size: [5, 2, 3, 4], method: "linear", boundary: "reflect" }]]) {
        const source = frugal.ndarray.fromArray(a.dtype, a.shape, a.data().slice());
        assert.ok(sameBits(await bytesOf(frugal.ndarray.resize(source, options)), await bytesOf(compute.ndarray.resize(a, options))), `maxCPUIntermediateBytes: 0 keeps ${JSON.stringify(options)} bitwise`);
        source.destroy();
    }
    frugal.destroy();
    assert.throws(() => new Compute(device, device.queue, { ndarray: { maxCPUIntermediateBytes: -1 } }), /ndarray\.maxCPUIntermediateBytes must be a safe integer >= 0 \(got -1\)/);

    // Validation of axes, sizes, and per-axis options.
    const invalid = [
        [{ axes: [], size: [] }, /compute\.ndarray\.resize: axes must be a non-empty list of distinct axes/],
        [{ axes: [0, -3], size: 2 }, /compute\.ndarray\.resize: axes must be distinct/],
        [{ axes: [0, 3], size: 2 }, /axis 3 is out of bounds for 3 dimensions/],
        [{ axes: [0, 1], size: [2] }, /size must be a single value or have one entry per axis \(2 axes, got 1 entries\)/],
        [{ axes: [0, 1], size: [2, 2.5] }, /size entries must be integers >= 0 that fit in u32 \(got 2\.5\)/],
        [{ axes: [0, 1], size: 2, boundary: ["edge"] }, /boundary must be a single value or have one entry per axis \(2 axes, got 1 entries\)/],
        [{ axes: [0, 1], size: 2, boundary: ["edge", "clamp"] }, /boundary must be "edge", "constant", "reflect", "symmetric", "wrap", or "renormalize" \(got clamp\)/],
        [{ axes: [0, 1], size: 2, boundary: ["edge", "wrap"], value: 1 }, /value applies only to boundary "constant"/]
    ];
    for (const [options, message] of invalid) assert.throws(() => compute.ndarray.resize(v, options), message, JSON.stringify(options));
    for (const a of [v, gv, field, fieldGPU, ramp, volume, volumeGPU, wide]) a.destroy();
}

// 27) resample reads the source at d × scale + offset per axis, with integer coordinates at sample centers.
{
    const { arraysApproxEqual } = createApproxHelpers(1e-12);
    const a = compute.ndarray.fromArray("f32", [3, 5], [1.5, -2, 4, 8, -16, 0.25, 3, -7, 9, 11, -0.5, 6, 2, -3, 5]);
    const g = compute.ndarray.toGPU(a);
    for (const x of [a, g]) {
        // Integer shifts copy samples exactly, so they equal pad() and slice(); a scale of -1 is a flip.
        const padded = compute.ndarray.slice(compute.ndarray.pad(x, { width: [[1, 0], [0, 2]], value: 9 }), [[0, 4], [2, 7]]);
        for (const method of ["nearest", "linear", "cubic"]) {
            assert.deepStrictEqual(await bytesOf(compute.ndarray.resample(x, { axes: [0, 1], size: [4, 5], scale: 1, offset: [-1, 2], method, boundary: "constant", value: 9 })), await bytesOf(padded), `${x.residency} ${method} integer shift`);
            if (method !== "cubic") assert.deepStrictEqual(await bytesOf(compute.ndarray.resample(x, { axes: -1, size: 5, scale: -1, offset: 4, method })), await bytesOf(compute.ndarray.flip(x, 1)), `${x.residency} ${method} flip`);
        }
        // Half-pixel scale and offset match resize up to coordinate rounding.
        const s = [3 / 4, 5 / 9];
        const resized = (x === a) ? Array.from(compute.ndarray.resize(x, { axes: [0, 1], size: [4, 9], method: "cubic" }).data()) : await readGPU(compute.ndarray.resize(x, { axes: [0, 1], size: [4, 9], method: "cubic" }));
        const resampled = compute.ndarray.resample(x, { axes: [0, 1], size: [4, 9], scale: s, offset: s.map((k) => k / 2 - 0.5), method: "cubic" });
        arraysApproxEqual((x === a) ? Array.from(resampled.data()) : await readGPU(resampled), resized, (x === a) ? 1e-12 : 1e-5, `${x.residency} half-pixel resample`);
        // Nearest rounds half up at -0.5 and 3.5 (not floor(x + 0.5), which rounds 0.49999999999999994 up), and out-of-range taps read the constant.
        const row = compute.ndarray.fromArray("f32", [4], [10, 20, 30, 40], { residency: x.residency });
        const nearest = { axes: 0, size: 4, scale: 1, method: "nearest", boundary: "constant", value: -1 };
        assert.deepStrictEqual((x === a) ? Array.from(compute.ndarray.resample(row, { ...nearest, offset: -0.5 }).data()) : await readGPU(compute.ndarray.resample(row, { ...nearest, offset: -0.5 })), [10, 20, 30, 40]);
        assert.deepStrictEqual((x === a) ? Array.from(compute.ndarray.resample(row, { ...nearest, offset: 0.5 }).data()) : await readGPU(compute.ndarray.resample(row, { ...nearest, offset: 0.5 })), [20, 30, 40, -1]);
        assert.deepStrictEqual(await bytesOf(compute.ndarray.resample(row, { ...nearest, size: 1, offset: 0.49999999999999994 })), Array.from(new Uint8Array(new Float32Array([10]).buffer)));
        // A renormalize row without in-range taps becomes the constant value.
        const outside = compute.ndarray.resample(row, { axes: 0, size: 3, scale: 2, offset: 2.5, boundary: "renormalize", value: -3 });
        assert.deepStrictEqual((x === a) ? Array.from(outside.data()) : await readGPU(outside), [35, -3, -3]);
        row.destroy();
    }

    // A renormalize row whose only in-range tap has a non-positive weight (antialiased cubic, 1.5 filter widths away) becomes the constant.
    for (const residency of ["cpu", "gpu"]) {
        const single = compute.ndarray.fromArray("f32", [1], [5], { residency });
        const far = { axes: 0, size: 1, scale: 3, method: "cubic", antialias: true, boundary: "renormalize", value: -1 };
        const values = async (offset) => { const r = compute.ndarray.resample(single, { ...far, offset }); return (residency === "cpu") ? Array.from(r.data()) : await readGPU(r); };
        assert.deepStrictEqual([await values(-4.5), await values(-1.5)], [[-1], [5]], `${residency} renormalize rows with one in-range tap`);
        single.destroy();
    }

    // Nearest constants are output-dtype bits on both backends, including complex and f64 outputs.
    for (const [source, options] of [[compute.ndarray.fromArray("u8", [3, 4], [0, 1, 2, 3, 250, 251, 252, 253, 7, 8, 9, 10]), { dtype: "f32", value: 0.1 }], [compute.ndarray.fromArray("c64", [2, 3], [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6]), { value: [1.5, -2] }], [compute.ndarray.fromArray("f32", [2, 3], [1, 2, 3, 4, 5, 6]), { dtype: "c128", value: [Math.PI, -0] }], [compute.ndarray.fromArray("f64", [2, 3], [Math.PI, -0, 1e300, NaN, 5, 6]), { value: -Math.E }]]) {
        const resample = { axes: [0, 1], size: [4, 5], scale: [1, 0.75], offset: [-1, 1.4], method: "nearest", boundary: ["constant", "wrap"], ...options };
        const cpu = compute.ndarray.resample(source, resample);
        assert.deepStrictEqual(await bytesOf(compute.ndarray.resample(compute.ndarray.toGPU(source), resample)), await bytesOf(cpu), `GPU nearest constants ${JSON.stringify(options)}`);
        const constant = compute.ndarray.slice(cpu, [0, 0]).get();
        assert.deepStrictEqual(constant, isNaN(options.value) ? constant : (Array.isArray(options.value) || cpu.dtype[0] !== "c") ? ((cpu.dtype === "f32") ? Math.fround(options.value) : options.value) : [options.value, 0], `${cpu.dtype} nearest constant value`);
        source.destroy();
    }

    // Physical grids: samples at origin + index × spacing map through scale = outSpacing / inSpacing and offset = (outOrigin - inOrigin) / inSpacing.
    const linear = (y, x) => 3 * x - 0.5 * y + 2;
    const inSpacing = [3, 2], outSpacing = [1.5, 0.5], inOrigin = [-1, 0], outOrigin = [0.5, 1.25];
    const grid = compute.ndarray.fromArray("f64", [4, 6], Array.from({ length: 24 }, (_, i) => linear(inOrigin[0] + Math.floor(i / 6) * inSpacing[0], inOrigin[1] + (i % 6) * inSpacing[1])));
    const physical = { axes: [0, 1], size: [5, 16], scale: outSpacing.map((s, k) => s / inSpacing[k]), offset: outOrigin.map((o, k) => (o - inOrigin[k]) / inSpacing[k]) };
    const expected = Array.from({ length: 80 }, (_, e) => linear(outOrigin[0] + Math.floor(e / 16) * outSpacing[0], outOrigin[1] + (e % 16) * outSpacing[1]));
    arraysApproxEqual(Array.from(compute.ndarray.resample(grid, physical).data()), expected, 1e-12, "CPU physical-grid resample of a linear function");
    arraysApproxEqual(await readGPU(compute.ndarray.resample(compute.ndarray.toGPU(compute.ndarray.cast(grid, "f32")), physical)), expected, 1e-5, "GPU physical-grid resample of a linear function");

    // Validation.
    const base = { axes: [0, 1], size: [2, 2], scale: 1 };
    const invalid = [
        [{ ...base, alignCorners: true }, /compute\.ndarray\.resample: alignCorners is not a resample option; express the alignment through scale and offset/],
        [{ axes: 0, size: 2 }, /compute\.ndarray\.resample: scale is required/],
        [{ ...base, scale: [1, NaN] }, /scale values must be finite numbers \(got NaN\)/],
        [{ ...base, offset: [0, Infinity] }, /offset values must be finite numbers \(got Infinity\)/],
        [{ ...base, scale: [1, 2, 3] }, /scale must be a single value or have one entry per axis \(2 axes, got 3 entries\)/],
        [{ ...base, offset: 2 ** 31 }, /compute\.ndarray\.resample: axis 0 samples the source coordinate 2147483648, and \|x\| \+ 1 \(the filter reach\) must stay below 2\^31 - 1/],
        [{ ...base, scale: 2 ** 30, method: "cubic", antialias: true }, /axis 0 samples the source coordinate 0, and \|x\| \+ 2147483648 \(the filter reach\)/],
        [{ ...base, value: 1 }, /value applies only to boundaries "constant" and "renormalize"/],
        [{ ...base, method: "nearest", boundary: "constant", dtype: "u8", value: 300 }, /value 300 is not exactly representable as u8/],
        [{ ...base, method: "nearest", boundary: "renormalize", value: [1, 2] }, /a \[re, im\] value requires a complex dtype \(got f32\)/],
        [{ ...base, boundary: "constant", value: [1, 2] }, /a \[re, im\] value requires a complex input \(got f32\)/]
    ];
    for (const [options, message] of invalid) assert.throws(() => compute.ndarray.resample(a, options), message, JSON.stringify(options));
    for (const x of [a, g, grid]) x.destroy();
}

// 28) Reductions: output shapes, default dtypes, axes normalization, and validation.
{
    const nd = compute.ndarray;
    for (const [op, table] of [["sum", { i8: "i32", u16: "u32", f64: "f64", c64: "c64" }], ["prod", { i16: "i32", u8: "u32", c128: "c128" }], ["mean", { i32: "f32", f32: "f32", c64: "c64" }], ["var", { u8: "f32", f64: "f64", c64: "f32", c128: "f64" }], ["min", { i16: "i16", f64: "f64" }], ["argmax", { u8: "u32", f64: "u32" }]]) {
        for (const [src, dtype] of Object.entries(table)) assert.strictEqual(nd[op](nd.zeros(src, { shape: [2, 3] })).dtype, dtype, `${op} of ${src}`);
    }
    const a = nd.fromArray("f32", [2, 3, 4], Array.from({ length: 24 }, (_, i) => i));
    for (const [options, shape] of [[{}, []], [{ keepDims: true }, [1, 1, 1]], [{ axes: -1 }, [2, 3]], [{ axes: [2, 0] }, [3]], [{ axes: [0, 2], keepDims: true }, [1, 3, 1]], [{ axes: [] }, [2, 3, 4]]]) assert.deepStrictEqual(nd.sum(a, options).shape, shape, JSON.stringify(options));
    assert.deepStrictEqual(nd.argmin(a, { axis: -1, keepDims: true }).shape, [2, 3, 1]);
    assert.deepStrictEqual(Array.from(nd.sum(a, { axes: [2, 0] }).data()), Array.from(nd.sum(a, { axes: [0, 2] }).data()), "Axes are sorted however the caller lists them");

    const f64GPU = nd.zeros("f64", { shape: [2] }, { residency: "gpu" }), u8GPU = nd.zeros("u8", { shape: [2] }, { residency: "gpu" }), f32GPU = nd.zeros("f32", { shape: [2] }, { residency: "gpu" });
    const invalid = [
        [() => nd.sum(a, { axes: [0, -3] }), /compute\.ndarray\.sum: axes must be distinct/],
        [() => nd.argmin(a, { axes: [0] }), /compute\.ndarray\.argmin: arg-reductions take a single axis, not axes/],
        [() => nd.mean(a, { overflow: "wrap" }), /compute\.ndarray\.mean: overflow applies only to integer outputs of sum/],
        [() => nd.prod(nd.zeros("u8", { shape: [1] }), { overflow: "saturate" }), /compute\.ndarray\.prod: integer products always wrap/],
        [() => nd.min(a, { dtype: "f64" }), /compute\.ndarray\.min: dtype is not an option because outputs keep the input dtype/],
        [() => nd.sum(nd.zeros("u8", { shape: [1] }), { dtype: "c64" }), /compute\.ndarray\.sum: real inputs cannot produce complex outputs/],
        [() => nd.sum(nd.zeros("c64", { shape: [1] }), { dtype: "f32" }), /compute\.ndarray\.sum: a real dtype would discard the imaginary parts of c64/],
        [() => nd.min(nd.zeros("c64", { shape: [1] })), /compute\.ndarray\.min: c64 values have no ordering; reduce compute\.ndarray\.real\(\) or compute\.ndarray\.imag\(\) views instead/],
        [() => nd.var(a, { ddof: -1 }), /compute\.ndarray\.var: ddof must be a finite number >= 0 \(got -1\)/],
        [() => nd.sum(a, { nan: "skip" }), /compute\.ndarray\.sum: nan must be "propagate" or "omit" \(got skip\)/],
        [() => nd.sum(a, { label: "x" }), /compute\.ndarray\.sum: GPU options \(encoder, out, label, copySrc, copyDst, usage\) are not supported for CPU arrays/],
        [() => nd.sum(f64GPU), /compute\.ndarray\.sum: GPU sum computes in f32 and does not support f64 inputs; use a CPU array or cast\(\) to f32/],
        [() => nd.prod(u8GPU, { dtype: "f64" }), /compute\.ndarray\.prod: GPU prod computes in f32 and does not support f64 outputs; use a CPU array/],
        [() => nd.sum(f32GPU, { out: nd.zeros("f64", { shape: [] }, { residency: "gpu" }) }), /out must have dtype f32 \(got f64\)/],
        [() => nd.minMax(f32GPU, { out: { low: f32GPU } }), /compute\.ndarray\.minMax: out has no low output; use min and max/]
    ];
    for (const [run, message] of invalid) assert.throws(run, message, String(run));
    assert.strictEqual(nd.sum(u8GPU, { dtype: "f64" }).dtype, "f64", "Integer sums may write f64 on the GPU");
    assert.strictEqual(nd.max(f64GPU).dtype, "f64", "Ordering reductions accept f64 on the GPU");
    assert.strictEqual(nd.varMean(nd.zeros("c64", { shape: [1] }), { dtype: "f64" }).mean.dtype, "c128", "A fused mean uses the complex counterpart of a real dtype");
    assert.deepStrictEqual(nd.sum(nd.zeros("f32", { shape: [0, 3] }, { residency: "gpu" }), { axes: 1 }).shape, [0], "An empty output has nothing to reduce");
    for (const x of [a, f64GPU, u8GPU, f32GPU]) x.destroy();
}

// 29) CPU reductions match NumPy on strided, flipped, unaligned, and broadcast views, and do not depend on the layout.
{
    const nd = compute.ndarray;
    const { arraysApproxEqual } = createApproxHelpers(0);
    const base = [-5.5, -4.25, -1, 4.25, 10.5, 2.75, -3, 10.25, 7.5, 7.75, 10, -2.75, 2.5, 10.75, 4, -0.75, -4.5, -5.25, -4, -0.75, 3.5, 10.75, 3, -2.75];
    const a = nd.fromArray("f32", [2, 3, 4], base);
    const same = (r, want, label) => { arraysApproxEqual(Array.from(r.data()), want, 0, label); r.destroy(); };
    same(nd.sum(a, { axes: [0, 2], keepDims: true }), [10, 6, 37], "sum axes [0, 2]");
    same(nd.prod(a, { axes: 2 }), [-99.34375, -887.90625, -1598.4375, -80.625, 70.875, -310.40625], "prod axes 2");
    same(nd.mean(a, { axes: 0 }), [-1.5, 3.25, 1.5, 1.75, 3, -1.25, -3.5, 4.75, 5.5, 9.25, 6.5, -2.75], "mean axes 0");
    same(nd.var(a, { axes: 1, ddof: 1 }), [72.33333587646484, 36.33333206176758, 49, 42.33333206176758, 19, 85.33333587646484, 19, 1.3333333730697632], "var axes 1 ddof 1");
    same(nd.std(a, { axes: 2 }), [3.7687034606933594, 5.630552768707275, 4.932354927062988, 4.192627429962158, 1.7184659242630005, 4.790942192077637], "std axes 2");
    same(nd.min(a, { axes: 1 }), [-5.5, -4.25, -3, -2.75, -4.5, -5.25, -4, -2.75], "min axes 1");
    same(nd.argmax(a, { axis: 2 }), [3, 0, 2, 1, 3, 1], "argmax axis 2");
    // a[::-1, ::2, 1:]
    const view = nd.slice(a, [[null, null, -1], [null, null, 2], [1, null]]);
    same(nd.sum(view, { axes: 1 }), [21.5, 7, -3.5, 3.5, 9, 1.5], "strided flipped sum");
    same(nd.var(view), [28.52083396911621], "strided flipped var");
    same(nd.argmax(view), [0], "strided flipped argmax is a flat logical index");
    same(nd.sum(nd.transpose(a, [2, 0, 1]), { axes: 0 }), [-6.5, 20.5, 22.5, 16.5, -14.5, 14.5], "transposed sum");
    same(nd.var(nd.slice(nd.reshape(a, [-1]), [[1, null, 3]])), [40.703125], "unaligned var");
    const row = nd.fromArray("f32", [2], [1.5, -2.5]), broadcast = nd.broadcastTo(row, [3, 2]);
    same(nd.sum(broadcast, { axes: 0 }), [4.5, -7.5], "broadcast sum");
    same(nd.var(broadcast, { axes: 1 }), [4, 4, 4], "broadcast var across");
    // axes: [] is a converted copy with the reduction's per-element result.
    same(nd.sum(a, { axes: [] }), base, "sum over no axes");
    same(nd.var(a, { axes: [] }), new Array(24).fill(0), "var over no axes");
    assert.ok(Array.from(nd.var(a, { axes: [], ddof: 1 }).data()).every(Number.isNaN), "1 - ddof <= 0 gives NaN");
    // Layout independence: op(view) is bitwise equal to op(contiguous(view)), for sums long enough to need several cascade levels.
    const long = nd.fromArray("f32", [40, 200], Array.from({ length: 8000 }, (_, i) => Math.sin(i * 12.9898) * Math.pow(2, (i % 40) - 20)));
    for (const v of [nd.flip(long), nd.transpose(long), nd.slice(long, [[null, null, 3], [null, null, -7]])]) {
        const dense = nd.contiguous(v);
        for (const [op, options] of [["sum", { axes: 0 }], ["var", {}], ["argmax", {}]]) assert.deepStrictEqual(await bytesOf(nd[op](v, options)), await bytesOf(nd[op](dense, options)), `${op} ${JSON.stringify(options)} must not depend on the layout`);
        dense.destroy();
    }
    for (const x of [a, row, long]) x.destroy();
}

// The documented CPU/GPU bounds of float reductions, for n reduced elements with S = sum |x|.
const ulpF32 = (x) => (x === 0) ? 2 ** -149 : 2 ** Math.max(Math.floor(Math.log2(Math.abs(x))) - 23, -149);
const sumBound = (r, n, S) => ulpF32(r) + 3 * n * 2 ** -48 * S + n * 2 ** -125;
const meanBound = (r, S) => 4 * ulpF32(r) + 3 * 2 ** -48 * S + 2 ** -125;
const varianceTerm = (n, ddof, S) => (n / (n - ddof)) * ((3 * 2 ** -48 * S) ** 2 + 2 ** -125);
const varBound = (r, n, ddof, S) => 8 * ulpF32(r) + varianceTerm(n, ddof, S);
const stdBound = (r, n, ddof, S) => 10 * ulpF32(r) + Math.sqrt(varianceTerm(n, ddof, S));
const assertWithin = (a, b, bound, label) => { assert.ok(Object.is(a, b) || Math.abs(a - b) <= bound, `${label}: |${a} - ${b}| = ${Math.abs(a - b)} exceeds ${bound}`); };

// 30) CPU and GPU agree bitwise on ordering and integer reductions and within the documented bound on float ones, in each strategy.
{
    const nd = compute.ndarray;
    let seed = 5;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (const [label, shape, axes, ops] of [["cooperative, inner axis", [13, 600], 1, ["sum", "var"]], ["threads, short axis", [80, 16], 1, ["sum"]], ["threads, chunked outer axis", [2048, 1024], 0, ["sum", "mean", "var", "std"]], ["cooperative, outer axis", [700, 200], 0, ["sum"]], ["several kept axes on a transposed view", [12, 5, 50], 0, ["sum"]], ["whole array in chunks", [40000], undefined, ["sum", "mean"]]]) {
        const n = shape.reduce((x, y) => x * y, 1), floats = Float32Array.from({ length: n }, () => (rnd() - 0.5) * 1000);
        const base = nd.fromArray("f32", shape, floats), baseGPU = nd.toGPU(base);
        const cpu = (shape.length === 3) ? nd.transpose(base, [2, 1, 0]) : base, gpu = (shape.length === 3) ? nd.transpose(baseGPU, [2, 1, 0]) : baseGPU;
        const options = (axes === undefined) ? {} : { axes };
        assert.deepStrictEqual(await bytesOf(nd.max(gpu, options)), await bytesOf(nd.max(cpu, options)), `${label}: max is bit-identical`);
        const fused = [nd.minMax(gpu, options), nd.minMax(cpu, options)];
        assert.deepStrictEqual(await bytesOf(fused[0].min), await bytesOf(fused[1].min), `${label}: fused min is bit-identical`);
        const R = (axes === undefined) ? n : cpu.shape[axes], S = R * 500;
        const bounds = { sum: (v) => sumBound(v, R, S), mean: (v) => meanBound(v, S), var: (v) => varBound(v, R, 0, S), std: (v) => stdBound(v, R, 0, S) };
        for (const op of ops) {
            const g = await readGPU(nd[op](gpu, options));
            valuesOf(nd[op](cpu, options)).forEach((v, k) => assertWithin(g[k], v, bounds[op](v), `${label}: ${op}[${k}]`));
        }
        base.destroy();
        baseGPU.destroy();
    }
    // f64 ordering reductions compare two-word keys on the GPU, including values that differ only in their low word.
    const wide = nd.fromArray("f64", [3, 4], [1, 1 + 2 ** -52, 1 - 2 ** -53, -1e300, 1e300, -(2 ** -1074), 2 ** -1074, Math.PI, -0, 0, 1 + 2 ** -51, -1e-300]), wideGPU = nd.toGPU(wide);
    for (const [op, options] of [["min", { axes: 1 }], ["max", { axes: 0 }], ["argmin", {}], ["argmax", { axis: 1 }]]) assert.deepStrictEqual(await bytesOf(nd[op](wideGPU, options)), await bytesOf(nd[op](wide, options)), `f64 ${op}`);
    // Narrow dtypes: reads below 32 bits, and outputs narrowed through whole words.
    const narrow = nd.fromArray("u16", [12, 41], Array.from({ length: 492 }, () => Math.floor(rnd() * 65536))), narrowGPU = nd.toGPU(narrow);
    for (const [op, options] of [["max", { axes: 0 }], ["sum", { axes: 1, dtype: "u16", overflow: "wrap" }], ["sum", { axes: 1, dtype: "u16" }]]) assert.deepStrictEqual(await bytesOf(nd[op](narrowGPU, options)), await bytesOf(nd[op](narrow, options)), `u16 ${op} ${JSON.stringify(options)}`);
    for (const x of [wide, wideGPU, narrow, narrowGPU]) x.destroy();
}

// 31) NaN modes, signed zeros, ties, and empty reductions, identically on both backends.
{
    const nd = compute.ndarray;
    const both = (dtype, shape, values) => { const c = nd.fromArray(dtype, shape, values); return [c, nd.toGPU(c)]; };
    const words = async (r) => Array.from(new Uint32Array(new Uint8Array(await bytesOf(r)).buffer));
    const floats = async (r) => Array.from(new Float32Array(new Uint8Array(await bytesOf(r)).buffer));
    const NAN32 = 0x7FC00000;
    const nans = both("f32", [2, 3], [1, NaN, 3, NaN, NaN, NaN]);
    const payload = nd.fromArray("f32", [3], [1, 0, 2]);
    new Uint32Array(payload.data().buffer, payload.data().byteOffset, 3)[1] = 0xFFC12345;
    const payloads = [payload, nd.toGPU(payload)], infs = both("f32", [3], [Infinity, NaN, 1]), cancel = both("f32", [3], [Infinity, 1, -Infinity]), wide = both("f64", [3], [1, NaN, -1]), zeros = both("f32", [2], [0, -0]), minus = both("f32", [3], [-0, -0, -0]), ties = both("f32", [6], [2, 1, 3, 1, 3, 2]);
    for (let b = 0; b < 2; b++) {
        const name = b ? "GPU" : "CPU", x = nans[b], omit = { axes: 1, nan: "omit" };
        for (const op of ["sum", "prod", "mean", "var", "min", "max"]) assert.deepStrictEqual(await words(nd[op](x, { axes: 1 })), [NAN32, NAN32], `${name} propagated ${op}`);
        assert.deepStrictEqual(await floats(nd.sum(x, omit)), [4, 0], `${name} omitted sum: all-NaN gives +0`);
        assert.deepStrictEqual(await floats(nd.prod(x, omit)), [3, 1], `${name} omitted prod: all-NaN gives 1`);
        assert.deepStrictEqual(await words(nd.mean(x, omit)), [new Uint32Array(new Float32Array([2]).buffer)[0], NAN32], `${name} omitted mean does not count NaN`);
        assert.strictEqual((await words(nd.var(x, { ...omit, ddof: 2 })))[0], NAN32, `${name} n - ddof <= 0 counts kept elements`);
        assert.deepStrictEqual(await words(nd.argmin(x, { axis: 1, nan: "omit" })), [0, 0xFFFFFFFF], `${name} all-NaN argmin sentinel`);
        assert.deepStrictEqual(await words(nd.argmin(x, { axis: 1 })), [1, 0], `${name} first NaN wins`);
        assert.deepStrictEqual(await words(nd.mean(payloads[b])), [NAN32], `${name} payloads canonicalize`);
        assert.deepStrictEqual(await floats(nd.sum(infs[b], { nan: "omit" })), [Infinity], `${name} omission keeps infinities`);
        assert.deepStrictEqual(await words(nd.sum(cancel[b])), [NAN32], `${name} opposite infinities`);
        assert.deepStrictEqual(await words(nd.min(wide[b])), [0, 0x7FF80000], `${name} f64 canonical NaN`);
        assert.ok(Object.is((await floats(nd.min(zeros[b])))[0], -0), `${name} min([+0, -0]) is -0`);
        assert.deepStrictEqual(await words(nd.argmin(zeros[b])), [0], `${name} argmin([+0, -0]) is the first`);
        assert.ok(Object.is((await floats(nd.sum(minus[b])))[0], -0), `${name} a sum of only -0 is -0`);
        assert.deepStrictEqual(await words(nd.argmax(ties[b])), [2], `${name} ties take the lowest index`);
    }
    // Empty reductions write identities and do not read the source; orderings throw because they have none.
    const empty = [nd.zeros("f32", { shape: [2, 0] }), nd.zeros("f32", { shape: [2, 0] }, { residency: "gpu" })];
    for (const x of empty) {
        const name = x.residency;
        assert.deepStrictEqual(await words(nd.sum(x, { axes: 1 })), [0, 0], `${name} empty sum`);
        assert.deepStrictEqual(await floats(nd.prod(x, { axes: 1 })), [1, 1], `${name} empty prod`);
        assert.deepStrictEqual(await words(nd.std(x, { axes: 1 })), [NAN32, NAN32], `${name} empty std`);
        assert.deepStrictEqual(await words(nd.varMean(x, { axes: 1 }).mean), [NAN32, NAN32], `${name} empty fused mean`);
        assert.throws(() => nd.argmax(x, { axis: 1 }), /compute\.ndarray\.argmax: cannot reduce an empty array because argmax has no identity/);
        assert.throws(() => nd.minMax(x, { axes: 1 }), /compute\.ndarray\.minMax: cannot reduce an empty array because minMax has no identity/);
    }
    const noCopyDst = nd.zeros("f32", { shape: [] }, { residency: "gpu", copyDst: false });
    nd.prod(empty[1], { out: noCopyDst, axes: [0, 1] });
    assert.deepStrictEqual(await readGPU(noCopyDst), [1], "An empty product reaches an out without COPY_DST");
    for (const pair of [nans, payloads, infs, cancel, wide, zeros, minus, ties, empty]) for (const x of pair) x.destroy();
    noCopyDst.destroy();
}

// 32) Integer sums are exact, then saturate or wrap once; integer products wrap modulo 2^32, bit-identically on both backends.
{
    const nd = compute.ndarray;
    const both = (dtype, shape, values) => { const c = nd.fromArray(dtype, shape, values); return [c, nd.toGPU(c)]; };
    const u32Max = both("u32", [5], new Array(5).fill(0xFFFFFFFF)), i32Min = both("i32", [3], new Array(3).fill(-2147483648));
    for (const [[c, g], cases] of [[u32Max, [[{}, [0xFFFFFFFF]], [{ overflow: "wrap" }, [(5 * 0xFFFFFFFF) % 2 ** 32]], [{ dtype: "f64" }, [5 * 0xFFFFFFFF]], [{ dtype: "u8", overflow: "wrap" }, [251]]]], [i32Min, [[{}, [-2147483648]], [{ dtype: "u32" }, [0]], [{ dtype: "f32" }, [Math.fround(-6442450944)]], [{ dtype: "i16" }, [-32768]]]]]) {
        for (const [options, want] of cases) {
            assert.deepStrictEqual(valuesOf(nd.sum(c, options)), want, `CPU ${c.dtype} ${JSON.stringify(options)}`);
            assert.deepStrictEqual(await readGPU(nd.sum(g, options)), want, `GPU ${c.dtype} ${JSON.stringify(options)}`);
        }
    }
    // A sum is exact in 64 bits, however many large values it holds, also across the chunks of a large reduction, and rounds to f32 once.
    const many = both("u32", [40000], new Array(40000).fill(0xFFFFFFFF));
    assert.deepStrictEqual(await readGPU(nd.sum(many[1], { dtype: "f64" })), [Number(40000n * 0xFFFFFFFFn)], "GPU large exact sum");
    assert.deepStrictEqual(await bytesOf(nd.sum(many[1], { dtype: "f32" })), await bytesOf(nd.sum(many[0], { dtype: "f32" })), "Large integer sums convert to f32 identically");
    const signed = both("i16", [3], [-300, 300, 300]), wrapped = both("i32", [2], [65537, 65537]);
    assert.deepStrictEqual(valuesOf(nd.prod(signed[0])), [-27000000], "An i16 product widens to i32");
    assert.deepStrictEqual(await bytesOf(nd.prod(signed[1], { dtype: "f32" })), await bytesOf(nd.prod(signed[0], { dtype: "f32" })), "A wrapped product written as f32");
    assert.deepStrictEqual(valuesOf(nd.prod(wrapped[0])), [131073], "Products wrap modulo 2^32");
    assert.deepStrictEqual(await bytesOf(nd.prod(wrapped[1])), await bytesOf(nd.prod(wrapped[0])), "Products wrap identically");
    // Integer means and variances start from the exact data.
    const big = both("u32", [2], [0xFFFFFFFF, 0xFFFFFFFD]);
    assert.deepStrictEqual(valuesOf(nd.mean(big[0], { dtype: "f64" })), [4294967294], "CPU integer mean keeps every bit before rounding");
    assert.deepStrictEqual(await readGPU(nd.var(big[1])), [1], "GPU integer variance of values above 2^24 is exact");
    for (const pair of [u32Max, i32Min, many, signed, wrapped, big]) for (const x of pair) x.destroy();
}

// 33) Variance and standard deviation: ddof, n - ddof <= 0, and accuracy on offset data.
{
    const nd = compute.ndarray;
    const { numberApproxEqual } = createApproxHelpers(0);
    const values = [1, 2, 4, 8, 16, 32];
    const c = nd.fromArray("f32", [6], values), g = nd.toGPU(c);
    const mean = values.reduce((a, b) => a + b) / 6, m2 = values.reduce((a, b) => a + (b - mean) * (b - mean), 0);
    for (const ddof of [0, 2.5]) {
        const want = m2 / (6 - ddof);
        numberApproxEqual(nd.var(c, { ddof }).get(), want, want * 2e-7, `CPU var ddof ${ddof}`);
        numberApproxEqual((await readGPU(nd.var(g, { ddof })))[0], want, 8 * ulpF32(want), `GPU var ddof ${ddof}`);
        numberApproxEqual((await readGPU(nd.std(g, { ddof })))[0], Math.sqrt(want), 10 * ulpF32(Math.sqrt(want)), `GPU std ddof ${ddof}`);
    }
    assert.ok(Number.isNaN(nd.var(c, { ddof: 6 }).get()), "CPU n - ddof <= 0");
    assert.ok(Number.isNaN((await readGPU(nd.std(g, { ddof: 100.5 })))[0]), "GPU n - ddof <= 0");
    // A large mean and a small spread lose every digit in a plain f32 sum, so these fail unless the GPU's compensation survives compilation.
    const count = 4096, offset = 1e6;
    const spread = Float32Array.from({ length: count }, (_, i) => offset + (Math.imul(i, Math.imul(i, 37) + 11) >>> 3 & 255) / 16);
    const exactMean = spread.reduce((a, b) => a + b, 0) / count;
    let exactM2 = 0;
    for (const x of spread) exactM2 += (x - exactMean) * (x - exactMean);
    const offsetGPU = nd.fromArray("f32", [count], spread, { residency: "gpu" }), S = count * offset;
    assertWithin((await readGPU(nd.mean(offsetGPU)))[0], Math.fround(exactMean), meanBound(exactMean, S), "offset mean");
    assertWithin((await readGPU(nd.var(offsetGPU)))[0], Math.fround(exactM2 / count), varBound(exactM2 / count, count, 0, S), "offset var");
    const alternating = nd.fromArray("f32", [count], Float32Array.from({ length: count }, (_, i) => (i % 2 === 1) ? 1 : ((i % 4 === 0) ? 1e8 : -1e8)), { residency: "gpu" });
    assert.deepStrictEqual(await readGPU(nd.sum(alternating)), [count / 2], "A cancellation-heavy sum keeps its low-order terms");
    for (const x of [c, g, offsetGPU, alternating]) x.destroy();
}

// 34) Complex reductions match NumPy, and a NaN in either component counts for the whole element.
{
    const nd = compute.ndarray;
    const { arraysApproxEqual } = createApproxHelpers(0);
    const c = nd.fromArray("c64", [2, 3], [1, 2, -3, 0.5, 2, -1, 0.5, 4, -1, -1, 3, 3]), g = nd.toGPU(c);
    const flat = (r) => Array.from(r.data());
    const gpuFlat = async (r) => (await readGPU(r)).flat();
    arraysApproxEqual(flat(nd.sum(c, { axes: 1 })), [0, 1.5, 2.5, 6], 0, "CPU complex sum");
    arraysApproxEqual(await gpuFlat(nd.sum(g, { axes: 1 })), [0, 1.5, 2.5, 6], 0, "GPU complex sum");
    arraysApproxEqual(flat(nd.prod(c, { axes: 1 })), [-13.5, -7, 24, -3], 0, "CPU complex prod");
    arraysApproxEqual(await gpuFlat(nd.prod(g, { axes: 1 })), [-13.5, -7, 24, -3], 1e-5, "GPU complex prod");
    arraysApproxEqual(await gpuFlat(nd.mean(g, { axes: 0 })), [0.75, 3, -2, -0.25, 2.5, 1], 4e-6, "GPU complex mean");
    arraysApproxEqual(flat(nd.var(c, { axes: 0 })), [1.0625, 1.5625, 4.25], 0, "CPU complex var");
    arraysApproxEqual(await readGPU(nd.std(g, { axes: 1 })), [2.4832773208618164, 2.7182509899139404], 3e-6, "GPU complex std");
    const cn = nd.fromArray("c64", [3], [1, 2, NaN, 5, 3, 6]), gn = nd.toGPU(cn);
    for (const x of [cn, gn]) {
        const name = x.residency;
        assert.deepStrictEqual(Array.from(new Uint32Array(new Uint8Array(await bytesOf(nd.sum(x))).buffer)), [0x7FC00000, 0x7FC00000], `${name} a NaN component makes the whole sum NaN`);
        const values = async (r) => Array.from(new Float32Array(new Uint8Array(await bytesOf(r)).buffer));
        assert.deepStrictEqual(await values(nd.mean(x, { nan: "omit" })), [2, 4], `${name} omitted complex mean`);
        assert.deepStrictEqual(await values(nd.var(x, { nan: "omit" })), [5], `${name} omitted complex var`);
    }
    // A running product that equals (1, 0) is not the identity: it still multiplies, as on the CPU.
    const unit = nd.fromArray("c64", [2], [1, 0, Infinity, 0]), unitGPU = nd.toGPU(unit);
    assert.deepStrictEqual(await bytesOf(nd.prod(unitGPU)), await bytesOf(nd.prod(unit)), "prod([(1, 0), (inf, 0)]) matches the CPU");
    assert.ok(nd.prod(unit).data().every(Number.isNaN), "(1 + 0i)(inf + 0i) has a NaN component, so the result is NaN");
    const alone = nd.fromArray("c64", [1], [Infinity, 0]), aloneGPU = nd.toGPU(alone);
    assert.deepStrictEqual(await bytesOf(nd.prod(aloneGPU)), await bytesOf(nd.prod(alone)), "A single factor is its own product");
    for (const x of [c, g, cn, gn, unit, unitGPU, alone, aloneGPU]) x.destroy();
}

// 35) Fused statistics equal their separate operations, and outs, encoders, and aliasing keep results bitwise identical.
{
    const nd = compute.ndarray;
    let seed = 11;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const floats = Float32Array.from({ length: 80 * 40 }, () => (rnd() < 0.02) ? NaN : (rnd() - 0.5) * 100);
    const c = nd.fromArray("f32", [80, 40], floats), g = nd.toGPU(c);
    for (const x of [c, g]) {
        const options = { axes: 1, nan: "omit" }, name = x.residency;
        const mm = nd.minMax(x, options), vm = nd.varMean(x, { ...options, ddof: 1 }), sm = nd.stdMean(x, options);
        assert.deepStrictEqual(await bytesOf(mm.max), await bytesOf(nd.max(x, options)), `${name} fused max`);
        assert.deepStrictEqual(await bytesOf(vm.var), await bytesOf(nd.var(x, { ...options, ddof: 1 })), `${name} fused var`);
        assert.deepStrictEqual(await bytesOf(vm.mean), await bytesOf(nd.mean(x, options)), `${name} fused mean is bitwise mean()`);
        assert.deepStrictEqual(await bytesOf(sm.std), await bytesOf(nd.std(x, options)), `${name} fused std`);
    }
    // Per-output out objects are optional individually, and two outputs must not overlap, though they may share a buffer.
    const outMin = nd.empty("f32", { shape: [40] }, { residency: "gpu" });
    const partly = nd.minMax(g, { axes: 0, nan: "omit", out: { min: outMin } });
    assert.strictEqual(partly.min, outMin);
    assert.notStrictEqual(partly.max, outMin);
    assert.deepStrictEqual(await bytesOf(outMin), await bytesOf(nd.min(g, { axes: 0, nan: "omit" })), "out.min");
    assert.throws(() => nd.minMax(g, { axes: 0, out: { min: outMin, max: outMin } }), /compute\.ndarray\.minMax: the min and max outputs must not overlap/);
    const pair = nd.empty("f32", { shape: [2, 40] }, { residency: "gpu" });
    const split = nd.minMax(g, { axes: 0, nan: "omit", out: { min: nd.slice(pair, [0]), max: nd.slice(pair, [1]) } });
    assert.deepStrictEqual(await bytesOf(split.max), await bytesOf(nd.max(g, { axes: 0, nan: "omit" })), "A fused output in the second half of a shared buffer");
    // Recording into a caller's encoder is bitwise identical to self-submission, and a repeat is too.
    for (const op of ["sum", "var", "min"]) {
        const options = { axes: 0, nan: "omit" }, self = nd[op](g, options), again = nd[op](g, options);
        assert.deepStrictEqual(await bytesOf(again), await bytesOf(self), `${op} repeats bitwise`);
        const encoder = device.createCommandEncoder();
        const recorded = nd[op](g, { ...options, encoder });
        device.queue.submit([encoder.finish()]);
        assert.deepStrictEqual(await bytesOf(recorded), await bytesOf(self), `${op} through an encoder`);
    }
    // An out sharing a raw buffer with the input is computed from a staged copy.
    const storage = compute.createStorageBuffer({ byteLength: 1024, copySrc: true, copyDst: true });
    const input = nd.wrap(storage, "f32", { shape: [4] }), shared = nd.wrap(storage, "f32", { shape: [] }, 512);
    storage.write(new Float32Array([1, 2, 3, 4]));
    nd.sum(input, { out: shared });
    assert.deepStrictEqual(await readGPU(shared), [10], "out in the input's raw buffer");
    // keepDims results broadcast against their inputs without readback.
    const row = nd.mean(g, { axes: 1, nan: "omit", keepDims: true });
    assert.deepStrictEqual(nd.broadcastTo(row, [80, 40]).shape, [80, 40]);
    for (const x of [c, g, outMin, pair, row]) x.destroy();
    storage.destroy();
}

// 36) Reductions whose temporaries exceed a binding run in batches, bitwise identically to one batch, and fail clearly when one output cannot fit.
{
    const nd = compute.ndarray;
    const withBindingLimit = (bytes, run) => {
        const limits = {};
        for (const key in device.limits) limits[key] = device.limits[key];
        limits.maxStorageBufferBindingSize = bytes;
        Object.defineProperty(device, "limits", { value: limits, configurable: true });
        const limited = new Compute(device, device.queue);
        try { return run(limited.ndarray); }
        finally { delete device.limits; limited.destroy(); }
    };
    // 512 bytes hold the input but not the 1,024 bytes of state that 64 outputs need, so these run in two or more batches.
    const u8 = nd.fromArray("u8", [64, 8], Uint8Array.from({ length: 512 }, (_, i) => Math.imul(i, 2654435761) >>> 24), { residency: "gpu" });
    const floats = nd.fromArray("f32", [16, 8], Float32Array.from({ length: 128 }, (_, i) => Math.sin(i) * 100), { residency: "gpu" });
    for (const [array, op] of [[u8, "minMax"], [u8, "std"], [floats, "varMean"]]) {
        const flat = (r) => (op === "minMax") ? [r.min, r.max] : (op === "varMean") ? [r.var, r.mean] : [r];
        const batched = flat(withBindingLimit(512, (limited) => limited[op](array, { axes: 1 })));
        const whole = flat(nd[op](array, { axes: 1 }));
        for (let i = 0; i < whole.length; i++) assert.deepStrictEqual(await bytesOf(batched[i]), await bytesOf(whole[i]), `batched ${array.dtype} ${op} output ${i}`);
    }
    assert.throws(() => withBindingLimit(8, (limited) => limited.minMax(floats, { axes: 1 })), /a 16-byte temporary for one output exceeds device\.limits\.maxStorageBufferBindingSize \(8\) or device\.limits\.maxBufferSize/);
    for (const x of [u8, floats]) x.destroy();
}

// 37) normalize computes min-max and z-score statistics over chosen axes in the input's residency, maps constant slices exactly, and never reads back.
{
    const nd = compute.ndarray;
    const both = (dtype, shape, values) => { const c = nd.fromArray(dtype, shape, values); return [c, nd.toGPU(c)]; };
    const read = async (y) => (y.residency === "gpu") ? readGPU(y) : valuesOf(y);
    const stats = (values, ddof = 0) => { const n = values.length, m = values.reduce((a, b) => a + b, 0) / n; return { m, s: Math.sqrt(values.reduce((a, v) => a + (v - m) ** 2, 0) / (n - ddof)), S: values.reduce((a, v) => a + Math.abs(v), 0), n }; };
    // The documented GPU bounds: the reductions' mean and std bounds through (x - m) / s, and for f32 min-max, whose statistics are
    // bit-identical, the rounded difference, the 2.5-ULP division, and q * width + r0, plus the f32 affine's and the CPU's own rounding.
    const zBound = (x, y, { m, s, S, n }) => (meanBound(m, S) + ulpF32(x - m)) / s + Math.abs(y) * stdBound(s, n, 0, S) / s + 4 * ulpF32(y);
    const mmBound = (y) => 7 * ulpF32(y);
    // [C, H, W] = [2, 2, 3] of small integers, so the f64 statistics and the JavaScript references below are computed identically.
    const img = [1, 2, 3, 4, 5, 6, -2, 0, 2, 4, 6, 8];
    const [c, g] = both("f32", [2, 2, 3], img);
    for (const slices of [[img.slice(0, 6), img.slice(6)], [img]]) {
        const options = (slices.length === 2) ? { axis: 0 } : {}, label = (slices.length === 2) ? "per channel" : "global", k = (i) => (slices.length === 2 && i >= 6) ? 1 : 0;
        const z = slices.map((v) => stats(v)), b = slices.map((v) => [Math.min(...v), Math.max(...v)]);
        const zRef = img.map((x, i) => (x - z[k(i)].m) / z[k(i)].s), mRef = img.map((x, i) => (x - b[k(i)][0]) / (b[k(i)][1] - b[k(i)][0]));
        assert.deepStrictEqual(valuesOf(nd.normalize(c, { method: "zscore", ...options })), zRef.map(Math.fround), `CPU ${label} z-score`);
        assert.deepStrictEqual(valuesOf(nd.normalize(c, { method: "minmax", ...options })), mRef.map(Math.fround), `CPU ${label} min-max`);
        const [gz, gm] = [await readGPU(nd.normalize(g, { method: "zscore", ...options })), await readGPU(nd.normalize(g, { method: "minmax", ...options }))];
        img.forEach((x, i) => { assertWithin(gz[i], zRef[i], zBound(x, zRef[i], z[k(i)]), `GPU ${label} z-score[${i}]`); assertWithin(gm[i], mRef[i], mmBound(mRef[i]), `GPU ${label} min-max[${i}]`); });
    }
    assert.deepStrictEqual(await bytesOf(nd.normalize(c, { method: "zscore", axes: [-1, 1] })), await bytesOf(nd.normalize(c, { method: "zscore", axis: 0 })), "axes names the reduced axes and axis the one kept axis");
    // range with integer outputs rounds half to even (2.5 to 2) and saturates beyond u8, identically on both backends.
    const [rc, rg] = both("f32", [3, 3], [0, 1, 2, 0, 1, 4, 5, 6, 7]);
    for (const [range, expected] of [[[0, 10], [0, 5, 10, 0, 2, 10, 0, 5, 10]], [[-10, 300], [0, 145, 255, 0, 68, 255, 0, 145, 255]]]) {
        for (const x of [rc, rg]) { const y = nd.normalize(x, { method: "minmax", axes: 1, range, dtype: "u8" }); assert.deepStrictEqual([y.dtype, await read(y)], ["u8", expected], `${x.residency} min-max onto [${range}] as u8`); }
    }
    // ddof, and n - ddof <= 0, which gives NaN even though a one-element slice has min == max.
    const sample = [img.slice(0, 6), img.slice(6)].map((v) => stats(v, 1));
    assert.deepStrictEqual(valuesOf(nd.normalize(c, { method: "zscore", axis: 0, ddof: 1 })), img.map((x, i) => Math.fround((x - sample[i >= 6 ? 1 : 0].m) / sample[i >= 6 ? 1 : 0].s)), "ddof: 1");
    for (const x of [c, g]) assert.ok((await read(nd.normalize(x, { method: "zscore", axes: [], ddof: 1 }))).every(Number.isNaN), `${x.residency}: n - ddof <= 0 gives NaN`);
    // NaN modes: propagate poisons the whole slice, omit skips NaN in the statistics and keeps it in place, and integer outputs map NaN to 0.
    const [nc, ng] = both("f32", [2, 3], [1, NaN, 3, 4, 5, 6]);
    for (const x of [nc, ng]) {
        const propagate = await read(nd.normalize(x, { method: "zscore", axes: 1 }));
        assert.ok(propagate.slice(0, 3).every(Number.isNaN) && !propagate.slice(3).some(Number.isNaN), `${x.residency}: propagate`);
        const omitted = await read(nd.normalize(x, { method: "zscore", axes: 1, nan: "omit" }));
        assert.ok(Object.is(omitted[0], -1) && Number.isNaN(omitted[1]) && omitted[2] === 1, `${x.residency}: omit keeps NaN in place (got ${omitted})`);
        assert.deepStrictEqual(await read(nd.normalize(x, { method: "minmax", axes: 1, nan: "omit", dtype: "i16" })), [0, 0, 1, 0, 0, 1], `${x.residency}: NaN becomes 0 in integer outputs`);
    }
    const [uc] = both("u8", [2, 2], [0, 10, 20, 20]);
    assert.deepStrictEqual(valuesOf(nd.normalize(uc, { method: "minmax", axes: 1, nan: "omit" })), [0, 1, 0, 0], "nan is accepted and ignored for integer inputs");
    // The GPU finds NaN by bit tests and writes the canonical quiet NaN, whatever the input's sign and payload bits.
    const nanStorage = compute.createStorageBuffer({ byteLength: 256, copySrc: true, copyDst: true });
    nanStorage.write(new Uint32Array([0xFFC00001, 0x3F800000]));
    const nanBits = new Uint32Array(Uint8Array.from(await bytesOf(nd.normalize(nd.wrap(nanStorage, "f32", { shape: [2] }), { scale: 2 }))).buffer);
    assert.deepStrictEqual(Array.from(nanBits), [0x7FC00000, 0x40000000], "GPU NaN outputs are canonical");
    // Constant slices map exactly to 0 (z-score) and range[0] (min-max), even where the statistics carry rounding noise: the f64 cascade
    // mean of three 0.1s is 0.10000000000000002 and their std 1.4e-17, and the f32 mean of i32 2^24 + 1 rounds away from f32(2^24 + 1).
    const tenths = nd.fromArray("f64", [3], [0.1, 0.1, 0.1]);
    assert.deepStrictEqual(valuesOf(nd.normalize(tenths, { method: "zscore" })), [0, 0, 0], "Three 0.1s");
    const [ic, ig] = both("i32", [2, 300], Array.from({ length: 600 }, (_, i) => (i < 300) ? 2 ** 24 + 1 : (i % 7) - 3));
    for (const x of [ic, ig]) {
        assert.deepStrictEqual((await read(nd.normalize(x, { method: "zscore", axes: 1 }))).slice(0, 300), new Array(300).fill(0), `${x.residency}: an i32 constant slice at an f32 rounding midpoint`);
        assert.deepStrictEqual((await read(nd.normalize(x, { method: "minmax", axes: 1, range: [-3, 3] }))).slice(0, 300), new Array(300).fill(-3), `${x.residency}: constant min-max`);
    }
    // epsilon: a std at or below epsilon divides by 1, so the slice is only centered.
    const [ec, eg] = both("f32", [3], [1, 1.25, 0.75]);
    for (const x of [ec, eg]) assert.deepStrictEqual(await read(nd.normalize(x, { method: "zscore", epsilon: 0.25 })), [0, 0.25, -0.25], `${x.residency} epsilon`);
    // Statistics methods equal stdMean with keepDims followed by explicit ndarray parameters, bitwise: f64 statistics on the CPU, f32 on the GPU.
    let seed = 3;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const [wc, wg] = both("f32", [6, 40], Float32Array.from({ length: 240 }, () => (rnd() - 0.3) * 1000));
    const fit = nd.stdMean(wc, { axes: 1, keepDims: true, dtype: "f64" });
    assert.deepStrictEqual(await bytesOf(nd.normalize(wc, { method: "zscore", axes: 1 })), await bytesOf(nd.normalize(wc, { mean: fit.mean, std: fit.std })), "CPU z-score is stdMean then { mean, std }");
    const gfit = nd.stdMean(wg, { axes: 1, keepDims: true });
    assert.deepStrictEqual(await bytesOf(nd.normalize(wg, { method: "zscore", axes: 1 })), await bytesOf(nd.normalize(wg, { mean: gfit.mean, std: gfit.std })), "GPU z-score is stdMean then { mean, std }");
    // CPU results depend only on the logical values: a flipped, strided view equals its contiguous copy bitwise.
    const view = nd.flip(nd.slice(wc, [[0, 6, 2], [1, 40, 3]]), 1);
    for (const method of ["zscore", "minmax"]) assert.deepStrictEqual(await bytesOf(nd.normalize(view, { method, axes: 1 })), await bytesOf(nd.normalize(nd.contiguous(view), { method, axes: 1 })), `CPU ${method} is layout-independent`);
    // A caller's encoder records the reductions and the affine map without submitting anything; the result equals self-submission bitwise.
    const monitor = globalThis.__wasmgpuTestMonitor;
    assert.ok(monitor, "The test runner's WebGPU monitor counts queue submissions");
    for (const options of [{ method: "zscore", axes: 1, ddof: 1 }, { method: "minmax", axes: 0, range: [0, 255], dtype: "u8" }]) {
        const self = nd.normalize(wg, options);
        const encoder = device.createCommandEncoder();
        const before = monitor.submissions;
        const recorded = nd.normalize(wg, { ...options, encoder });
        assert.strictEqual(monitor.submissions, before, `${options.method} through an encoder submits nothing`);
        device.queue.submit([encoder.finish()]);
        assert.deepStrictEqual(await bytesOf(recorded), await bytesOf(self), `${options.method} through an encoder`);
        const out = nd.empty(self.dtype, { shape: wg.shape }, { residency: "gpu" });
        assert.strictEqual(nd.normalize(wg, { ...options, out }), out);
        assert.deepStrictEqual(await bytesOf(out), await bytesOf(self), `${options.method} into out`);
    }
    // An out that aliases the input is computed from a staged copy.
    const input = nd.fromArray("f32", [4], [1, 2, 3, 5], { residency: "gpu" });
    nd.normalize(input, { method: "zscore", out: input });
    assert.deepStrictEqual((await readGPU(input)).map((v) => Math.round(v * 1e4) / 1e4), [-1.1832, -0.5071, 0.169, 1.5213], "out aliasing the input");
    // Empty inputs return empty outputs without reductions (min and max have no identity) or WebAssembly calls.
    for (const residency of ["cpu", "gpu"]) for (const method of ["zscore", "minmax"]) {
        const y = nd.normalize(nd.empty("u8", { shape: [0, 3] }, { residency }), { method, axes: 1 });
        assert.deepStrictEqual([y.residency, y.dtype, y.shape], [residency, "f32", [0, 3]], `empty ${residency} ${method}`);
    }
    // Validation follows the documented order and messages under the normalize name: one case for each class of rule.
    assert.throws(() => nd.normalize(c, { method: "zscore", scale: 2 }), /method computes its own parameters; do not also pass scale, offset, mean, or std/);
    assert.throws(() => nd.normalize(c, { method: "percentile" }), /method "percentile" is not supported yet; use "minmax" or "zscore"/);
    assert.throws(() => nd.normalize(c, { scale: 2, axes: 1 }), /axes applies only to the statistics methods/);
    assert.throws(() => nd.normalize(c, { method: "minmax", axes: [1, 1] }), /compute\.ndarray\.normalize: axes must be distinct/, "Statistics options are validated under the normalize name, not minMax or stdMean");
    assert.throws(() => nd.normalize(c, { method: "minmax", range: [1, 1] }), /range\[0\] must be less than range\[1\] \(got \[1, 1\]\)/);
    assert.throws(() => nd.normalize(g, { method: "minmax", range: [0, 1e-50] }), /range and epsilon must stay finite when rounded to f32 for the GPU/);
    const tenthsGPU = nd.toGPU(tenths);
    assert.throws(() => nd.normalize(tenthsGPU, { method: "zscore" }), /GPU normalize computes in f32 and does not support f64 inputs or outputs/);
    // Only the affine fragment declares parameter bindings, so gather, pad, cast, resize, and the reductions still create their pipelines.
    const after = [nd.cast(g, "u8"), nd.pad(g, { width: 1, mode: "edge" }), nd.contiguous(nd.transpose(g)), nd.resize(g, { axes: [1, 2], size: [3, 4] }), nd.sum(g, { axes: [1, 2] }), ...Object.values(nd.minMax(g))];
    assert.deepStrictEqual(await readGPU(after[0]), img.map((v) => Math.max(0, v)), "cast after an affine pipeline");
    assert.deepStrictEqual(await readGPU(after[4]), [21, 18], "sum after an affine pipeline");
    for (const x of [c, g, rc, rg, nc, ng, uc, tenths, tenthsGPU, ic, ig, ec, eg, wc, wg, fit.std, fit.mean, gfit.std, gfit.mean, view, input, ...after]) x.destroy();
    nanStorage.destroy();
}

// 38) ndarray parameters broadcast against the input in its residency, mix with numbers, and apply statistics from one array to another.
{
    const nd = compute.ndarray;
    const both = (dtype, shape, values) => { const c = nd.fromArray(dtype, shape, values); return [c, nd.toGPU(c)]; };
    const train = [1, 10, 3, 30, 5, 50, 7, 70], test = [2, 20, 4, 40, 9, 90];
    const [tc, tg] = both("f32", [4, 2], train), [xc, xg] = both("f32", [3, 2], test);
    // Fit on train (keepDims statistics over the samples), apply to test, with no readback on the GPU.
    const cpuFit = nd.stdMean(tc, { axes: 0, keepDims: true }), gpuFit = nd.stdMean(tg, { axes: 0, keepDims: true });
    const mean = valuesOf(cpuFit.mean), std = valuesOf(cpuFit.std);
    assert.deepStrictEqual(valuesOf(nd.normalize(xc, { mean: cpuFit.mean, std: cpuFit.std })), test.map((x, i) => Math.fround((x - mean[i % 2]) / std[i % 2])), "CPU: f32 statistics convert exactly to f64 parameters");
    const applied = await readGPU(nd.normalize(xg, { mean: gpuFit.mean, std: gpuFit.std }));
    const [gm, gs] = [await readGPU(gpuFit.mean), await readGPU(gpuFit.std)];
    applied.forEach((y, i) => { const r = (test[i] - gm[i % 2]) / gs[i % 2]; assertWithin(y, r, 4 * ulpF32(r) + ulpF32(test[i] - gm[i % 2]) / gs[i % 2], `GPU fit on train, apply to test [${i}]`); });
    // Numbers and arrays mix, arrays broadcast by NumPy rules (a [2] row and an i16 [3, 1] column against [3, 2]), and views are read in place;
    // a flipped broadcast view and its own base in the other role share one binding on the GPU.
    const [rowC, rowG] = both("f32", [2], [2, -1]), [colC, colG] = both("i16", [3, 1], [10, 20, 30]);
    for (const [x, row, col] of [[xc, rowC, colC], [xg, rowG, colG]]) {
        const read = async (y) => (x === xg) ? readGPU(y) : valuesOf(y);
        assert.deepStrictEqual(await read(nd.normalize(x, { scale: row, offset: col })), test.map((v, i) => v * [2, -1][i % 2] + [10, 20, 30][i >> 1]), `${x.residency}: broadcast scale and integer offset arrays`);
        assert.deepStrictEqual(await read(nd.normalize(x, { scale: 2, offset: col })), test.map((v, i) => 2 * v + [10, 20, 30][i >> 1]), `${x.residency}: a number with an array`);
        assert.deepStrictEqual(await read(nd.normalize(x, { mean: nd.broadcastTo(nd.flip(row), [3, 2]), std: row })), test.map((v, i) => (v - [-1, 2][i % 2]) / [2, -1][i % 2]), `${x.residency}: a flipped broadcast view and its base`);
    }
    // CPU f64 parameters are passed to WebAssembly in place, so strided views at an offset exercise the element offset and stride conversion.
    const table = nd.fromArray("f64", [2, 3], [5, 0.5, 6, 0.25, 7, 0.125]);
    assert.deepStrictEqual(valuesOf(nd.normalize(xc, { mean: nd.slice(table, [0, [0, 3, 2]]), std: nd.slice(table, [1, [1, 3]]) })), test.map((v, i) => Math.fround((v - [5, 6][i % 2]) / [7, 0.125][i % 2])), "CPU f64 parameters are strided views of one array");
    // ndarray std gets no zero rule.
    const zero = nd.fromArray("f32", [1], [0]);
    assert.deepStrictEqual(valuesOf(nd.normalize(xc, { mean: 0, std: zero })).slice(0, 2), [Infinity, Infinity], "ndarray std has no zero rule");
    // A parameter sharing a raw buffer with out is staged.
    const storage = compute.createStorageBuffer({ byteLength: 1024, copySrc: true, copyDst: true });
    storage.write(new Float32Array([1, 2, 3, 4]));
    const out = nd.wrap(storage, "f32", { shape: [2, 2] }, 256);
    nd.normalize(nd.slice(tg, [[0, 2]]), { scale: nd.wrap(storage, "f32", { shape: [2] }, 0), offset: 1, out });
    assert.deepStrictEqual(await readGPU(out), [2, 21, 4, 61], "a parameter in out's raw buffer");
    // Parameters keep the input's residency and are real, the GPU rejects f64 ones, they broadcast to the input, and axis is only for number arrays.
    const wide = nd.fromArray("f64", [2], [5, 6], { residency: "gpu" });
    assert.throws(() => nd.normalize(xc, { mean: gpuFit.mean, std: 1 }), /mean must be a CPUndarray like the input array \(got a GPUndarray\).*toCPU\(\)/);
    assert.throws(() => nd.normalize(xc, { scale: nd.zeros("c64", { shape: [2] }) }), /compute\.ndarray\.normalize: complex dtypes \(c64, c128\) are not supported$/);
    assert.throws(() => nd.normalize(xg, { offset: wide }), /GPU normalize computes in f32 and does not support f64 parameters; cast\(\) offset to f32/);
    assert.throws(() => nd.normalize(xc, { scale: rowC, axis: 1 }), /axis applies only to number-array parameters; ndarray parameters broadcast against the input, so reshape\(\) or expandDims\(\) scale/);
    assert.throws(() => nd.normalize(xc, { scale: nd.reshape(colC, [1, 3]) }), /compute\.ndarray\.normalize: scale: cannot broadcast shape \[1,3\] to \[3,2\]/);
        for (const x of [tc, tg, xc, xg, cpuFit.mean, cpuFit.std, gpuFit.mean, gpuFit.std, rowC, rowG, colC, colG, wide, table, zero]) x.destroy();
    storage.destroy();
}

// 39) slice accepts NumPy basic-indexing strings, and both spec forms support "..." and new axes through one resolver.
{
    const nd = compute.ndarray;
    const layoutOf = (v) => [v.shape, v.stridesBytes, v.offsetBytes, v.byteLength, v.baseOffsetBytes];
    const read = (v) => (v.residency === "gpu") ? readGPU(v) : valuesOf(v);
    const vol = nd.fromArray("f32", [80, 2, 5], Array.from({ length: 800 }, (_, i) => i));
    const volGPU = nd.toGPU(vol);
    const crop = [];
    for (let i = 10; i < 74; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 5; k += 2) crop.push(i * 10 + j * 5 + k);
    for (const a of [vol, volGPU]) {
        // A string spec and its array form give the same view, including whitespace, negative steps, and omitted bounds.
        const pairs = [["10:74, :, ::2", [[10, 74], null, [null, null, 2]]], ["-1", [-1]], [" ::-30 ,1 , 4:0:-2 ", [[null, null, -30], 1, [4, 0, -2]]], [":5, :, -2:", [[null, 5], null, [-2]]]];
        for (const [text, array] of pairs) {
            const s = nd.slice(a, text), t = nd.slice(a, array);
            assert.deepStrictEqual(layoutOf(s), layoutOf(t), `${a.residency}: "${text}" and its array form`);
            assert.deepStrictEqual(await read(s), await read(t), `${a.residency}: "${text}" values`);
        }
        assert.deepStrictEqual([nd.slice(a, "10:74, :, ::2").shape, await read(nd.slice(a, "10:74, :, ::2"))], [[64, 2, 3], crop], `${a.residency}: crop`);
        assert.deepStrictEqual(await read(nd.slice(a, " ::-30 ,1 , 4:0:-2 ")), [799, 797, 499, 497, 199, 197], `${a.residency}: negative steps`);
        // An ellipsis fills the unindexed axes, possibly none, in either form.
        for (const [text, array, shape] of [["..., 0", ["...", 0], [80, 2]], ["1, ...", [1, "..."], [2, 5]], ["3, ..., 1, 2", [3, "...", 1, 2], []]]) {
            const s = nd.slice(a, text);
            assert.deepStrictEqual([s.shape, layoutOf(s)], [shape, layoutOf(nd.slice(a, array))], `${a.residency}: "${text}"`);
        }
        assert.deepStrictEqual(await read(nd.slice(a, "3, ..., 1, 2")), [37], `${a.residency}: an ellipsis over zero axes gives a 0-d view`);
        // None and newaxis insert size-1 axes with expandDims' strides; the array form spells them "newaxis", since null there is a full axis.
        assert.deepStrictEqual(layoutOf(nd.slice(a, ":, None")), layoutOf(nd.expandDims(a, 1)), `${a.residency}: ":, None"`);
        assert.deepStrictEqual(layoutOf(nd.slice(a, "newaxis")), layoutOf(nd.expandDims(a, 0)), `${a.residency}: "newaxis"`);
        assert.deepStrictEqual(layoutOf(nd.slice(a, [null, "newaxis"])), layoutOf(nd.expandDims(a, 1)), `${a.residency}: array "newaxis"`);
        assert.deepStrictEqual(layoutOf(nd.slice(a, "None, ::-1, ..., None")), layoutOf(nd.expandDims(nd.slice(a, [[null, null, -1]]), [0, 4])), `${a.residency}: new axes around a flipped view`);
        assert.deepStrictEqual([nd.slice(a, [null]).shape, nd.slice(a, "None").shape], [[80, 2, 5], [1, 80, 2, 5]], `${a.residency}: array null is a full axis, string None is a new axis`);
        // Empty specs are full views, and one trailing comma is allowed.
        for (const spec of ["", " \t", []]) assert.deepStrictEqual([layoutOf(nd.slice(a, spec)).slice(0, 3), nd.slice(a, spec).base], [[a.shape, a.stridesBytes, a.offsetBytes], a], `${a.residency}: empty spec ${JSON.stringify(spec)}`);
        assert.deepStrictEqual(layoutOf(nd.slice(a, "0,")), layoutOf(nd.slice(a, [0])), `${a.residency}: "0,"`);
    }
    // Complex views keep their dtype and are placed like any other GPU view.
    const z = nd.fromArray("c64", [4, 3], Array.from({ length: 12 }, (_, i) => [i, -i]).flat());
    const zg = nd.toGPU(z);
    const zv = nd.slice(zg, "1:, None, ::-2");
    assert.deepStrictEqual([zv.dtype, zv.shape, zv.stridesBytes, zv.baseOffsetBytes, zv.offsetBytes, zv.byteLength], ["c64", [3, 1, 2], [24, -32, -16], 24, 16, 72]);
    assert.deepStrictEqual(layoutOf(zv), layoutOf(nd.slice(zg, [[1, null], "newaxis", [null, null, -2]])));
    assert.deepStrictEqual(await readGPU(zv), [[5, -5], [3, -3], [8, -8], [6, -6], [11, -11], [9, -9]]);
    // Parse errors name the item and the spec, with a hint when one applies; semantic errors are shared with the array form.
    assert.throws(() => nd.slice(vol, "1:3, x"), /compute\.ndarray\.slice: cannot parse item 1 \("x"\) of the spec "1:3, x": expected an integer, start:stop\[:step\], "\.\.\.", "None", or "newaxis"/);
    assert.throws(() => nd.slice(vol, "[0, 1]"), /cannot parse item 0 \("\[0"\).*omit the brackets/);
    assert.throws(() => nd.slice(vol, "0, 1.5"), /cannot parse item 1 \("1\.5"\).*indices must be integers/);
    assert.throws(() => nd.slice(vol, "..., 0, ..."), /compute\.ndarray\.slice: at most one ellipsis \("\.\.\."\) is allowed/);
    assert.throws(() => nd.slice(vol, "0, 0, 0, 0"), /compute\.ndarray\.slice: too many indices: 4 indexed for an array with 3 dimensions/);
    assert.throws(() => nd.slice(vol, "::0"), /compute\.ndarray\.slice: step for axis 0 must be nonzero/);
    assert.throws(() => nd.slice(vol, [0, undefined]), /spec\[1\] is undefined \(Python None converts to undefined\): use a string spec such as ":, None", or "newaxis" for a new axis, or null for a full axis/);
    assert.throws(() => nd.slice(vol, ["1:3", ":"]), /spec\[0\] is the string "1:3": pass the whole NumPy-style spec as one string/);
    assert.throws(() => nd.slice(vol, 5), /compute\.ndarray\.slice: spec must be a string or an array \(got number\)/);
    for (const x of [vol, volGPU, z, zg]) x.destroy();
}

// 40) Cleanup releases the shared compute context before its browser GPU device.
{
    compute.destroy();
    await destroyTestDevice(device);
}
