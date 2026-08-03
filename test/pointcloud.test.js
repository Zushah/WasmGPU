/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, createBufferReaders, destroyTestDevice, setupTest, trackDestroy } from "./utils/helpers.js";
import * as WasmGPU from "../dist/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers();

const { device } = await setupTest({ initWebAssembly: WasmGPU.initWebAssembly, webgpu: true });
const { PointCloud, Compute, WasmMemoryView } = WasmGPU;
assert.ok(PointCloud, "Missing export: PointCloud");
assert.ok(Compute, "Missing export: Compute");
assert.ok(WasmMemoryView, "Missing export: WasmMemoryView");
const compute = new Compute(device, device.queue);
assert.ok(compute.kernels && typeof compute.kernels.copyF32 === "function", "Missing kernel: compute.kernels.copyF32");
const { readBufferAsF32 } = createBufferReaders(compute);

const createRawStorageBuffer = (label, data) => device.createBuffer({ label, size: data.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });

const baseScaleTransform = { componentCount: 4, componentIndex: 3, stride: 4, offset: 0 };

const makeWasmF32View = (length, ptr = 0, name = "pointcloud-wasm-f32") => { const memory = new WebAssembly.Memory({ initial: 1 }), moduleRef = WasmGPU.webassemblyInterop.fromMemory(memory, { name }), data = new Float32Array(memory.buffer, ptr, length), view = moduleRef.view({ ptr, length, dtype: "f32", name }); assert.ok(view instanceof WasmMemoryView, "Expected fromMemory().view() to return a WasmMemoryView"); return { memory, moduleRef, data, view }; };

const makeWasmF32ViewWithLengthGlobal = (length, ptr = 0, name = "pointcloud-wasm-f32-global") => { const memory = new WebAssembly.Memory({ initial: 1 }), lengthGlobal = new WebAssembly.Global({ value: "i32", mutable: true }, length), moduleRef = WasmGPU.webassemblyInterop.fromMemory(memory, { name }), data = new Float32Array(memory.buffer, ptr, 64), view = moduleRef.view({ ptr, length: { global: lengthGlobal }, dtype: "f32", name }); assert.ok(view instanceof WasmMemoryView, "Expected fromMemory().view() to return a WasmMemoryView"); return { memory, moduleRef, lengthGlobal, data, view }; };

// 1) CPU data path: setData() -> upload() -> pointsBuffer readable by GPU.
{
    const data = new Float32Array([1.0, 2.0, 3.0, 0.50, 4.0, 6.0, 8.0, 0.25]);

    const pc = new PointCloud({ scaleTransform: baseScaleTransform });
    assert.strictEqual(typeof pc.setData, "function", "PointCloud.setData missing");
    pc.setData(data);

    assert.strictEqual(pc.pointCount, 2, "PointCloud.pointCount mismatch after setData");

    assert.strictEqual(typeof pc.upload, "function", "PointCloud.upload missing");
    pc.upload(device, device.queue);

    assert.ok(pc.pointsBuffer, "PointCloud.pointsBuffer not created after upload");

    const got = await readBufferAsF32(pc.pointsBuffer, data.length);
    arraysApproxEqual(got, data, 0, "CPU-uploaded pointsBuffer contents mismatch");

    pc.destroy?.();
}

// 2) External WebAssembly memory views: constructors, explicit refresh, CPU snapshots, validation, and grow-only GPU capacity.
{
    const colorPoints = makeWasmF32View(8, 0, "pc:wasm:data:ctor-colors");
    const colorData = makeWasmF32View(8, 0, "pc:wasm:colors:ctor");
    colorPoints.data.set([1, 2, 3, 0.5, 4, 6, 8, 0.25]);
    colorData.data.set([1, 0, 0, 1, 0, 1, 0, 1]);
    const colorCloud = new PointCloud({ wasmData: colorPoints.view, wasmColors: colorData.view, scaleTransform: baseScaleTransform });
    assert.strictEqual(colorCloud.pointCount, 2, "PointCloud should derive pointCount from wasmData length");
    assert.strictEqual(colorCloud.getPointRecord(0), null, "Default wasmData path should not retain CPU point records");
    assert.deepStrictEqual([colorCloud.getLocalBounds().empty, colorCloud.getLocalBounds().partial], [true, true], "Default external-wasm PointCloud bounds should stay partial until recomputed");
    colorCloud.upload(device, device.queue);
    assert.ok(colorCloud.pointsBuffer, "PointCloud.pointsBuffer not created after wasmData upload");
    assert.ok(colorCloud.colorsBuffer, "PointCloud.colorsBuffer not created after wasmColors upload");
    arraysApproxEqual(await readBufferAsF32(colorCloud.pointsBuffer, 8), colorPoints.data, 0, "wasmData-uploaded pointsBuffer contents mismatch");
    arraysApproxEqual(await readBufferAsF32(colorCloud.colorsBuffer, 8), colorData.data, 0, "wasmColors-uploaded colorsBuffer contents mismatch");
    const colorRevision0 = colorCloud.getScaleSourceDescriptor()?.revision ?? -1;
    colorCloud.bindGroupKey = "pc:stable-wasm-colors";
    colorData.data.set([0, 0, 1, 1], 4);
    colorCloud.refreshWasmColors();
    assert.strictEqual(colorCloud.bindGroupKey, "pc:stable-wasm-colors", "refreshWasmColors() should not invalidate a reused bind group");
    colorCloud.upload(device, device.queue);
    assert.strictEqual(colorCloud.getScaleSourceDescriptor()?.revision ?? -1, colorRevision0, "refreshWasmColors() should not bump scale revision for color-only refreshes");
    assert.strictEqual(colorCloud.bindGroupKey, "pc:stable-wasm-colors", "wasmColors upload should not invalidate a reused bind group");
    arraysApproxEqual(await readBufferAsF32(colorCloud.colorsBuffer, 8), colorData.data, 0, "refreshWasmColors() should upload refreshed colors");
    assert.throws(() => colorCloud.refreshWasmColors({ pointCount: 3 }), /refreshWasmData\(\) or refreshFromWasm\(\)/i, "wasmColors should not change pointCount while wasmData is active");
    colorPoints.data.set([10, 20, 30, 0.5, 40, 50, 60, 0.25]);
    colorCloud.refreshWasmData({ pointCount: 2, recomputeBounds: true });
    arraysApproxEqual(colorCloud.boundsMax, [40, 50, 60], 1e-6, "recomputeBounds should use active external wasmData records");
    colorPoints.data.set([-1, -2, -3, 0.5, 4, 5, 6, 0.25]);
    colorCloud.refreshWasmData({ pointCount: 2, recomputeBounds: true });
    arraysApproxEqual(colorCloud.boundsMin, [-1, -2, -3], 1e-6, "Repeated recomputeBounds should refresh bounds without requiring CPU retention");
    colorCloud.destroy?.();

    const explicitCloud = new PointCloud({ wasmData: colorPoints.view, boundsMin: [-2, -3, -4], boundsMax: [2, 3, 4], scaleTransform: baseScaleTransform });
    explicitCloud.refreshWasmData({ pointCount: 2, recomputeBounds: true });
    arraysApproxEqual(explicitCloud.boundsMin, [-2, -3, -4], 1e-6, "Explicit PointCloud bounds should not be overwritten by wasm recomputeBounds");
    explicitCloud.destroy?.();

    const capacityData = makeWasmF32ViewWithLengthGlobal(20, 0, "pc:wasm:data:capacity");
    capacityData.data.set([1, 2, 3, 0.1, 4, 5, 6, 0.2, 7, 8, 9, 0.3, 10, 11, 12, 0.4, 13, 14, 15, 0.5]);
    const capacityCloud = new PointCloud({ wasmData: capacityData.view, pointCount: 2, wasmCapacity: 4, scaleTransform: baseScaleTransform });
    assert.strictEqual(capacityCloud.pointCount, 2, "Explicit pointCount should override extra wasmData capacity");
    capacityCloud.upload(device, device.queue);
    const firstBuffer = capacityCloud.pointsBuffer;
    assert.ok(firstBuffer, "PointCloud wasmData upload should allocate a pointsBuffer");
    assert.ok(firstBuffer.size >= 4 * 16, "wasmCapacity should be measured in point records");
    arraysApproxEqual(await readBufferAsF32(firstBuffer, 8), capacityData.data.subarray(0, 8), 0, "Explicit pointCount upload should use only the active range");
    capacityCloud.bindGroupKey = "pc:stable-wasm-data";
    capacityCloud.refreshWasmData({ pointCount: 3 });
    assert.strictEqual(capacityCloud.bindGroupKey, "pc:stable-wasm-data", "refreshWasmData() should not invalidate a reused bind group");
    capacityCloud.upload(device, device.queue);
    assert.strictEqual(capacityCloud.pointsBuffer, firstBuffer, "PointCloud should reuse wasmData GPU capacity when active count fits");
    assert.strictEqual(capacityCloud.bindGroupKey, "pc:stable-wasm-data", "wasmData upload should not invalidate a reused bind group");
    capacityCloud.refreshWasmData({ pointCount: 5 });
    capacityCloud.upload(device, device.queue);
    assert.notStrictEqual(capacityCloud.pointsBuffer, firstBuffer, "PointCloud should grow wasmData GPU capacity when active count exceeds capacity");
    assert.ok(capacityCloud.pointsBuffer.size >= 5 * 16, "Grown wasmData buffer should fit the active point count");
    assert.strictEqual(capacityCloud.bindGroupKey, null, "Growing wasmData GPU capacity should invalidate the bind group");

    const revision0 = capacityCloud.getScaleSourceDescriptor()?.revision ?? -1;
    capacityData.lengthGlobal.value = 12;
    capacityCloud.refreshWasmData();
    assert.strictEqual(capacityCloud.pointCount, 3, "refreshWasmData() should derive an updated pointCount from wasmData length");
    capacityCloud.upload(device, device.queue);
    assert.ok((capacityCloud.getScaleSourceDescriptor()?.revision ?? -1) > revision0, "refreshWasmData() should bump the scale revision");
    capacityCloud.refreshWasmData({ pointCount: 3 });
    capacityData.lengthGlobal.value = 4;
    assert.throws(() => capacityCloud.upload(device, device.queue), /wasmData length must be at least pointCount\*4/i, "upload() should validate refreshed wasmData length before reading");
    capacityCloud.destroy?.();

    const keepPoints = makeWasmF32View(8, 0, "pc:wasm:keepcpu:points");
    const keepColors = makeWasmF32View(8, 0, "pc:wasm:keepcpu:colors");
    keepPoints.data.set([1, 2, 3, 0.1, 4, 5, 6, 0.2]);
    keepColors.data.set([1, 0, 0, 1, 0, 1, 0, 1]);
    const keepCloud = new PointCloud({ wasmData: keepPoints.view, wasmColors: keepColors.view, keepCPUData: true, scaleTransform: baseScaleTransform });
    let rec = keepCloud.getPointRecord(1);
    assert.ok(rec, "keepCPUData=true should snapshot wasmData for point records");
    arraysApproxEqual(rec.packed, [4, 5, 6, 0.2], 1e-6, "Wasm point CPU snapshot mismatch");
    arraysApproxEqual(rec.color, [0, 1, 0, 1], 1e-6, "Wasm color CPU snapshot mismatch");
    keepPoints.data.set([40, 50, 60, 0.8], 4);
    arraysApproxEqual(keepCloud.getPointRecord(1).packed, [4, 5, 6, 0.2], 1e-6, "Wasm CPU records should be retained as copies");
    keepCloud.refreshFromWasm({ pointCount: 2, keepCPUData: true });
    rec = keepCloud.getPointRecord(1);
    arraysApproxEqual(rec.packed, [40, 50, 60, 0.8], 1e-6, "refreshFromWasm() should refresh retained CPU point data");
    keepCloud.destroy?.();

    const invalidCases = [
        { message: "Invalid derived wasmData pointCount should throw", error: /wasmData length must be a multiple of 4/i, create: () => new PointCloud({ wasmData: makeWasmF32View(5, 0, "pc:wasm:bad:data:multiple").view, scaleTransform: baseScaleTransform }) },
        { message: "Short explicit-count wasmData should throw", error: /wasmData length must be at least pointCount\*4/i, create: () => new PointCloud({ wasmData: makeWasmF32View(7, 0, "pc:wasm:bad:data:count").view, pointCount: 2, scaleTransform: baseScaleTransform }) },
        { message: "Large safe pointCount should not wrap to zero", error: /wasmData length must be at least pointCount\*4/i, create: () => new PointCloud({ wasmData: makeWasmF32View(4, 0, "pc:wasm:bad:data:large-count").view, pointCount: 2 ** 32, scaleTransform: baseScaleTransform }) },
        { message: "Unsafe pointCount should throw", error: /safe integer/i, create: () => new PointCloud({ wasmData: makeWasmF32View(4, 0, "pc:wasm:bad:data:unsafe-count").view, pointCount: Number.MAX_SAFE_INTEGER + 1, scaleTransform: baseScaleTransform }) },
        { message: "Overflowing pointCount range should throw", error: /exceeds Number\.MAX_SAFE_INTEGER/i, create: () => new PointCloud({ wasmData: makeWasmF32View(4, 0, "pc:wasm:bad:data:overflow-count").view, pointCount: Number.MAX_SAFE_INTEGER, scaleTransform: baseScaleTransform }) },
        { message: "Short wasmColors should throw", error: /wasmColors length must be at least pointCount\*4/i, create: () => new PointCloud({ wasmColors: makeWasmF32View(4, 0, "pc:wasm:bad:colors").view, pointCount: 2, scaleTransform: baseScaleTransform }) },
        { message: "Large safe wasmCapacity should not truncate", error: null, create: () => { const pc = new PointCloud({ wasmData: makeWasmF32View(0, 0, "pc:wasm:large-capacity").view, wasmCapacity: 2 ** 32, scaleTransform: baseScaleTransform }); assert.strictEqual(pc._wasmPointCapacityHint, 2 ** 32, "wasmCapacity should preserve safe integers without 32-bit truncation"); pc.destroy?.(); } },
        { message: "Unsafe wasmCapacity should throw", error: /safe integer/i, create: () => new PointCloud({ wasmData: makeWasmF32View(0, 0, "pc:wasm:bad:unsafe-capacity").view, wasmCapacity: Number.MAX_SAFE_INTEGER + 1, scaleTransform: baseScaleTransform }) },
        { message: "Non-WasmMemoryView wasmData should throw", error: /wasmData must be a WasmMemoryView/i, create: () => new PointCloud({ wasmData: makeWasmF32View(8, 0, "pc:wasm:bad:source-type").data, scaleTransform: baseScaleTransform }) },
        { message: "Non-f32 wasmData should throw", error: /wasmData dtype must be 'f32'/i, create: () => { const memory = new WebAssembly.Memory({ initial: 1 }), moduleRef = WasmGPU.webassemblyInterop.fromMemory(memory, { name: "pc:wasm:bad:dtype" }); return new PointCloud({ wasmData: moduleRef.view({ ptr: 0, length: 8, dtype: "u32", name: "u32-points" }), scaleTransform: baseScaleTransform }); } }
    ];
    for (const testCase of invalidCases) {
        if (testCase.error) assert.throws(testCase.create, testCase.error, testCase.message);
        else assert.doesNotThrow(testCase.create, testCase.message);
    }
}

// 3) External buffers are borrowed by default, owned when requested, and owned replacements are destroyed exactly once.
{
    const borrowed = createRawStorageBuffer("pc:ownership:borrowed", new Float32Array(8));
    const ownedByCtor = createRawStorageBuffer("pc:ownership:ctor", new Float32Array(8));
    const ownedBySetter = createRawStorageBuffer("pc:ownership:setter", new Float32Array(8));
    const replaceBorrowed = createRawStorageBuffer("pc:ownership:replace:borrowed", new Float32Array(4));
    const replaceOwnedA = createRawStorageBuffer("pc:ownership:replace:owned-a", new Float32Array(4));
    const replaceOwnedB = createRawStorageBuffer("pc:ownership:replace:owned-b", new Float32Array(4));
    const borrowedDestroyed = trackDestroy(borrowed);
    const ctorDestroyed = trackDestroy(ownedByCtor);
    const setterDestroyed = trackDestroy(ownedBySetter);
    const replaceBorrowedDestroyed = trackDestroy(replaceBorrowed);
    const replaceOwnedADestroyed = trackDestroy(replaceOwnedA);
    const replaceOwnedBDestroyed = trackDestroy(replaceOwnedB);

    new PointCloud({ scaleTransform: baseScaleTransform, pointsBuffer: borrowed, pointCount: 2 }).destroy?.();
    assert.strictEqual(borrowedDestroyed(), 0, "Expected default external PointCloud pointsBuffer to be borrowed");

    new PointCloud({ scaleTransform: baseScaleTransform, pointsBuffer: ownedByCtor, pointCount: 2, ownBuffers: true }).destroy?.();
    assert.strictEqual(ctorDestroyed(), 1, "Expected constructor ownBuffers to transfer PointCloud pointsBuffer ownership");

    const setterOwned = new PointCloud({ scaleTransform: baseScaleTransform, pointCount: 2 });
    setterOwned.setColorsBuffer(ownedBySetter, { ownBuffer: true });
    setterOwned.destroy?.();
    assert.strictEqual(setterDestroyed(), 1, "Expected setter ownBuffer to transfer PointCloud colorsBuffer ownership");

    const replaced = new PointCloud({ scaleTransform: baseScaleTransform });
    replaced.setPointsBuffer(replaceBorrowed, 1);
    replaced.setPointsBuffer(replaceOwnedA, 1, { ownBuffer: true });
    replaced.setPointsBuffer(replaceOwnedB, 1, { ownBuffer: true });
    replaced.destroy?.();
    assert.strictEqual(replaceBorrowedDestroyed(), 0, "Expected replaced borrowed PointCloud pointsBuffer to remain alive");
    assert.strictEqual(replaceOwnedADestroyed(), 1, "Expected replaced owned PointCloud pointsBuffer to be destroyed exactly once");
    assert.strictEqual(replaceOwnedBDestroyed(), 1, "Expected final owned PointCloud pointsBuffer to be destroyed exactly once");

    const cpu = new PointCloud({ scaleTransform: baseScaleTransform });
    cpu.setData(new Float32Array([1, 2, 3, 0.25, 4, 5, 6, 0.5]));
    cpu.setColors(new Float32Array([1, 0, 0, 1, 0, 1, 0, 1]));
    cpu.upload(device, device.queue);
    const cpuPointsDestroyed = trackDestroy(cpu.pointsBuffer);
    const cpuColorsDestroyed = trackDestroy(cpu.colorsBuffer);
    cpu.destroy?.();
    assert.strictEqual(cpuPointsDestroyed(), 1, "Expected CPU-created PointCloud pointsBuffer to be destroyed");
    assert.strictEqual(cpuColorsDestroyed(), 1, "Expected CPU-created PointCloud colorsBuffer to be destroyed");

    borrowed.destroy();
    replaceBorrowed.destroy();
}

// 4) Uniform packing sanity for unified ScaleTransform + visual params.
{
    const pc = new PointCloud({ scaleTransform: baseScaleTransform });

    assert.strictEqual(typeof pc.getUniformBufferSize, "function", "PointCloud.getUniformBufferSize missing");
    assert.strictEqual(typeof pc.getUniformData, "function", "PointCloud.getUniformData missing");

    const byteSize = pc.getUniformBufferSize();
    assert.strictEqual(byteSize, 240, "PointCloud uniform buffer size should be 240 bytes (15 vec4<f32>)");

    assert.ok(("basePointSize" in pc), "PointCloud.basePointSize missing");
    assert.ok(("minPointSize" in pc), "PointCloud.minPointSize missing");
    assert.ok(("maxPointSize" in pc), "PointCloud.maxPointSize missing");
    assert.ok(("sizeAttenuation" in pc), "PointCloud.sizeAttenuation missing");
    assert.ok(("opacity" in pc), "PointCloud.opacity missing");
    assert.ok(("softness" in pc), "PointCloud.softness missing");
    assert.ok(("scaleTransform" in pc), "PointCloud.scaleTransform missing");
    assert.strictEqual(typeof pc.setScaleTransform, "function", "PointCloud.setScaleTransform missing");

    pc.basePointSize = 6.0;
    pc.minPointSize = 2.0;
    pc.maxPointSize = 12.0;
    pc.sizeAttenuation = 3.0;
    pc.opacity = 0.25;
    pc.softness = 0.6;
    pc.setScaleTransform({ componentCount: 4, componentIndex: 3, valueMode: "component", stride: 4, offset: 0, mode: "symlog", clampMode: "range", domainMin: -5, domainMax: 5, clampMin: -2, clampMax: 2, percentileLow: 5, percentileHigh: 95, logBase: 10, symlogLinThresh: 0.25, gamma: 2, invert: true });

    const u = pc.getUniformData();
    assert.ok(u instanceof Float32Array, "getUniformData() should return Float32Array");
    assert.strictEqual(u.byteLength, 240, "getUniformData() byteLength mismatch");

    numberApproxEqual(u[0], 6.0, 1e-6, "sizeParams.x mismatch");
    numberApproxEqual(u[1], 2.0, 1e-6, "sizeParams.y mismatch");
    numberApproxEqual(u[2], 12.0, 1e-6, "sizeParams.z mismatch");
    numberApproxEqual(u[3], 3.0, 1e-6, "sizeParams.w mismatch");

    numberApproxEqual(u[4], 4.0, 1e-6, "scaleSource.componentCount mismatch");
    numberApproxEqual(u[5], 3.0, 1e-6, "scaleSource.componentIndex mismatch");
    numberApproxEqual(u[7], 4.0, 1e-6, "scaleSource.stride mismatch");

    numberApproxEqual(u[8], -5.0, 1e-6, "scaleDomain.domainMin mismatch");
    numberApproxEqual(u[9], 5.0, 1e-6, "scaleDomain.domainMax mismatch");
    numberApproxEqual(u[11], 1.0, 1e-6, "scaleDomain.clampMode(range) mismatch");

    numberApproxEqual(u[12], -2.0, 1e-6, "scaleClamp.clampMin mismatch");
    numberApproxEqual(u[13], 2.0, 1e-6, "scaleClamp.clampMax mismatch");
    numberApproxEqual(u[16], 2.0, 1e-6, "scaleParams.mode(symlog) mismatch");
    numberApproxEqual(u[18], 0.25, 1e-6, "scaleParams.symlogLinThresh mismatch");
    numberApproxEqual(u[19], 2.0, 1e-6, "scaleParams.gamma mismatch");
    numberApproxEqual(u[20], 1.0, 1e-6, "scaleFlags.invert mismatch");

    numberApproxEqual(u[24], 0.25, 1e-6, "visual.opacity mismatch");
    numberApproxEqual(u[25], 0.6, 1e-6, "visual.softness mismatch");

    assert.ok(("dirtyUniforms" in pc), "PointCloud.dirtyUniforms missing");
    assert.strictEqual(typeof pc.markUniformsClean, "function", "PointCloud.markUniformsClean missing");

    pc.markUniformsClean();
    assert.strictEqual(!!pc.dirtyUniforms, false, "Expected dirtyUniforms to be false after markUniformsClean()");
    pc.setScaleTransform({ ...pc.scaleTransform, domainMin: -6 });
    assert.strictEqual(!!pc.dirtyUniforms, true, "Expected dirtyUniforms to become true after setScaleTransform()");

    pc.destroy?.();
}

// 5) CPU-side helpers: bounds + scale stats application/source descriptor.
{
    const data = new Float32Array([1.0, 2.0, 3.0, 0.50, 4.0, 6.0, 8.0, 0.25]);

    const pc = new PointCloud({ scaleTransform: baseScaleTransform });
    pc.setData(data);

    assert.strictEqual(typeof pc.computeBoundsFromCPUData, "function", "PointCloud.computeBoundsFromCPUData missing");
    assert.strictEqual(typeof pc.applyScaleStats, "function", "PointCloud.applyScaleStats missing");
    assert.strictEqual(typeof pc.getScaleSourceDescriptor, "function", "PointCloud.getScaleSourceDescriptor missing");

    pc.computeBoundsFromCPUData();
    assert.ok(Array.isArray(pc.boundsCenter) && pc.boundsCenter.length === 3, "boundsCenter should be a vec3 array");
    assert.ok(Number.isFinite(pc.boundsRadius), "boundsRadius should be finite");

    numberApproxEqual(pc.boundsCenter[0], 2.5, 1e-6, "boundsCenter.x mismatch");
    numberApproxEqual(pc.boundsCenter[1], 4.0, 1e-6, "boundsCenter.y mismatch");
    numberApproxEqual(pc.boundsCenter[2], 5.5, 1e-6, "boundsCenter.z mismatch");
    numberApproxEqual(pc.boundsMin[0], 1.0, 1e-6, "boundsMin.x mismatch");
    numberApproxEqual(pc.boundsMin[1], 2.0, 1e-6, "boundsMin.y mismatch");
    numberApproxEqual(pc.boundsMin[2], 3.0, 1e-6, "boundsMin.z mismatch");
    numberApproxEqual(pc.boundsMax[0], 4.0, 1e-6, "boundsMax.x mismatch");
    numberApproxEqual(pc.boundsMax[1], 6.0, 1e-6, "boundsMax.y mismatch");
    numberApproxEqual(pc.boundsMax[2], 8.0, 1e-6, "boundsMax.z mismatch");
    assert.ok(pc.boundsRadius > 0, "Expected boundsRadius > 0");

    pc.applyScaleStats({ count: 2, finiteCount: 2, min: 0.25, max: 0.50, percentileMin: 0.3, percentileMax: 0.45, histogramBins: 128 });
    const t = pc.scaleTransform;
    numberApproxEqual(t.domainMin, 0.25, 1e-6, "scaleTransform.domainMin mismatch after applyScaleStats()");
    numberApproxEqual(t.domainMax, 0.50, 1e-6, "scaleTransform.domainMax mismatch after applyScaleStats()");
    numberApproxEqual(t.clampMin, 0.3, 1e-6, "scaleTransform.clampMin mismatch after applyScaleStats()");
    numberApproxEqual(t.clampMax, 0.45, 1e-6, "scaleTransform.clampMax mismatch after applyScaleStats()");

    pc.upload(device, device.queue);
    const source = pc.getScaleSourceDescriptor();
    assert.ok(source, "getScaleSourceDescriptor() should return a descriptor once pointsBuffer exists");
    assert.strictEqual(source.count, 2, "Scale source count mismatch");
    assert.strictEqual(source.componentIndex, 3, "Scale source componentIndex mismatch");

    pc.destroy?.();
}

// 6) Cleanup releases the shared compute context before its browser GPU device.
{
    compute.destroy();
    await destroyTestDevice(device);
}
