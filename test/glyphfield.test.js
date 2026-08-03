/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, destroyTestDevice, setupTest, trackDestroy } from "./utils/helpers.js";
import * as WasmGPU from "../dist/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers();

const { device } = await setupTest({ initWebAssembly: WasmGPU.initWebAssembly, webgpu: true });
const { GlyphField, Compute, wasm, WasmMemoryView } = WasmGPU;
assert.ok(GlyphField, "Missing export: GlyphField");
assert.ok(Compute, "Missing export: Compute");
assert.ok(wasm, "Missing export: wasm");
assert.ok(WasmMemoryView, "Missing export: WasmMemoryView");
const compute = new Compute(device, device.queue);
assert.ok(compute.kernels && typeof compute.kernels.copyF32 === "function", "Missing kernel: compute.kernels.copyF32");

const createGlyphBufferSet = (label) => ({
    positions: compute.createStorageBuffer({ label: `${label}:positions`, data: new Float32Array([1.0, 2.0, 3.0, 0.0]), copySrc: false }),
    rotations: compute.createStorageBuffer({ label: `${label}:rotations`, data: new Float32Array([0.0, 0.0, 0.0, 1.0]), copySrc: false }),
    scales: compute.createStorageBuffer({ label: `${label}:scales`, data: new Float32Array([1.0, 1.0, 1.0, 0.0]), copySrc: false }),
    attributes: compute.createStorageBuffer({ label: `${label}:attributes`, data: new Float32Array([0.25, 0.5, 0.75, 1.0]), copySrc: false })
});

const trackGlyphBufferDestroy = (buffers) => ({ positions: trackDestroy(buffers.positions.buffer), rotations: trackDestroy(buffers.rotations.buffer), scales: trackDestroy(buffers.scales.buffer), attributes: trackDestroy(buffers.attributes.buffer) });

const assertGlyphDestroyCounts = (trackers, count, label) => { for (const [key, tracker] of Object.entries(trackers)) assert.strictEqual(tracker(), count, `${label}: ${key}`); };

const destroyExternalGlyphBuffers = (buffers) => { buffers.positions.destroy(); buffers.rotations.destroy(); buffers.scales.destroy(); buffers.attributes.destroy(); };

const baseScaleTransform = { componentCount: 4, componentIndex: 0, stride: 4, offset: 0 };

const createExternalGlyphDescriptor = (buffers, extra = {}) => ({
    scaleTransform: baseScaleTransform,
    positionsBuffer: buffers.positions.buffer,
    rotationsBuffer: buffers.rotations.buffer,
    scalesBuffer: buffers.scales.buffer,
    attributesBuffer: buffers.attributes.buffer,
    instanceCount: 1,
    ...extra
});

const setExternalGlyphBuffers = (field, buffers, opts) => { field.setBuffers(buffers.positions.buffer, buffers.rotations.buffer, buffers.scales.buffer, buffers.attributes.buffer, 1, opts); };

// 1) CPU data path: setCPUData() -> upload() -> SoA buffers readable by GPU.
{
    const instanceCount = 2;
    const positions = new Float32Array([1.0, 2.0, 3.0, 0.0, 4.0, 5.0, 6.0, 0.0]);
    const rotations = new Float32Array([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.70710677, 0.70710677]);
    const scales = new Float32Array([1.0, 1.0, 1.0, 0.0, 2.0, 1.0, 0.5, 0.0]);
    const attributes = new Float32Array([1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.5]);

    const gf = new GlyphField({ scaleTransform: baseScaleTransform });
    assert.strictEqual(typeof gf.setCPUData, "function", "GlyphField.setCPUData missing");
    gf.setCPUData(positions, rotations, scales, attributes, { instanceCount });

    assert.strictEqual(gf.instanceCount, instanceCount, "GlyphField.instanceCount mismatch after setCPUData");

    assert.strictEqual(typeof gf.upload, "function", "GlyphField.upload missing");
    gf.upload(device, device.queue);

    assert.ok(gf.positionsBuffer, "GlyphField.positionsBuffer not created after upload");
    assert.ok(gf.rotationsBuffer, "GlyphField.rotationsBuffer not created after upload");
    assert.ok(gf.scalesBuffer, "GlyphField.scalesBuffer not created after upload");
    assert.ok(gf.attributesBuffer, "GlyphField.attributesBuffer not created after upload");

    const outPos = compute.createStorageBuffer({ label: "glyphfield:cpu:positions:out", byteLength: positions.byteLength, copySrc: true });
    const outRot = compute.createStorageBuffer({ label: "glyphfield:cpu:rotations:out", byteLength: rotations.byteLength, copySrc: true });
    const outScl = compute.createStorageBuffer({ label: "glyphfield:cpu:scales:out", byteLength: scales.byteLength, copySrc: true });
    const outAttr = compute.createStorageBuffer({ label: "glyphfield:cpu:attributes:out", byteLength: attributes.byteLength, copySrc: true });

    compute.kernels.copyF32(gf.positionsBuffer, { out: outPos, count: positions.length });
    compute.kernels.copyF32(gf.rotationsBuffer, { out: outRot, count: rotations.length });
    compute.kernels.copyF32(gf.scalesBuffer, { out: outScl, count: scales.length });
    compute.kernels.copyF32(gf.attributesBuffer, { out: outAttr, count: attributes.length });

    await device.queue.onSubmittedWorkDone();

    arraysApproxEqual(await outPos.readAs(Float32Array), positions, 0, "CPU-uploaded positionsBuffer contents mismatch");
    arraysApproxEqual(await outRot.readAs(Float32Array), rotations, 0, "CPU-uploaded rotationsBuffer contents mismatch");
    arraysApproxEqual(await outScl.readAs(Float32Array), scales, 0, "CPU-uploaded scalesBuffer contents mismatch");
    arraysApproxEqual(await outAttr.readAs(Float32Array), attributes, 0, "CPU-uploaded attributesBuffer contents mismatch");

    outPos.destroy();
    outRot.destroy();
    outScl.destroy();
    outAttr.destroy();
    gf.destroy?.();
}

// 2) External WebAssembly memory views: constructors, explicit refresh, CPU snapshots, validation, and grow-only GPU capacity.
{
    const readF32 = async (buffer, count, label = "glyphfield:wasm:read") => { const out = compute.createStorageBuffer({ label, byteLength: count * 4, copySrc: true }); try { compute.kernels.copyF32(buffer, { out, count }); await device.queue.onSubmittedWorkDone(); return await out.readAs(Float32Array); } finally { out.destroy(); } };
    const makeView = (length, name, dynamicLength = false) => { const memory = new WebAssembly.Memory({ initial: 1 }), moduleRef = WasmGPU.webassemblyInterop.fromMemory(memory, { name }), data = new Float32Array(memory.buffer, 0, Math.max(length, 64)), lengthGlobal = dynamicLength ? new WebAssembly.Global({ value: "i32", mutable: true }, length) : null, view = moduleRef.view({ ptr: 0, length: lengthGlobal ? { global: lengthGlobal } : length, dtype: "f32", name }); assert.ok(view instanceof WasmMemoryView, "Expected fromMemory().view() to return a WasmMemoryView"); return { memory, moduleRef, data, lengthGlobal, view }; };

    const positions = makeView(8, "gf:wasm:positions");
    const rotations = makeView(8, "gf:wasm:rotations");
    const scales = makeView(8, "gf:wasm:scales");
    const attributes = makeView(8, "gf:wasm:attributes");
    positions.data.set([1, 2, 3, 0, 4, 5, 6, 0]);
    rotations.data.set([0, 0, 0, 1, 0, 0, 0.70710677, 0.70710677]);
    scales.data.set([1, 1, 1, 0, 2, 1, 0.5, 0]);
    attributes.data.set([0.25, 0.5, 0.75, 1, 0.1, 0.2, 0.3, 0.4]);
    const gf = new GlyphField({ wasmPositions: positions.view, wasmRotations: rotations.view, wasmScales: scales.view, wasmAttributes: attributes.view, scaleTransform: baseScaleTransform });

    assert.strictEqual(gf.instanceCount, 2, "GlyphField should derive instanceCount from wasmPositions length");
    assert.strictEqual(gf.getAttributeRecord(0), null, "Default wasmAttributes path should not retain CPU records");
    assert.deepStrictEqual([gf.getLocalBounds().empty, gf.getLocalBounds().partial], [true, true], "Default external-wasm GlyphField bounds should stay partial until recomputed");
    gf.upload(device, device.queue);
    assert.ok(gf.positionsBuffer, "GlyphField.positionsBuffer not created after wasmPositions upload");
    assert.ok(gf.rotationsBuffer, "GlyphField.rotationsBuffer not created after wasmRotations upload");
    assert.ok(gf.scalesBuffer, "GlyphField.scalesBuffer not created after wasmScales upload");
    assert.ok(gf.attributesBuffer, "GlyphField.attributesBuffer not created after wasmAttributes upload");
    arraysApproxEqual(await readF32(gf.positionsBuffer, 8, "gf:wasm:positions:read"), positions.data.subarray(0, 8), 0, "wasmPositions-uploaded buffer mismatch");
    arraysApproxEqual(await readF32(gf.attributesBuffer, 8, "gf:wasm:attributes:read"), attributes.data.subarray(0, 8), 0, "wasmAttributes-uploaded buffer mismatch");

    const attrRevision0 = gf.getScaleSourceDescriptor()?.revision ?? -1;
    gf.bindGroupKey = "gf:stable-wasm";
    attributes.data.set([0.8, 0.7, 0.6, 0.5], 4);
    gf.refreshWasmAttributes();
    assert.ok((gf.getScaleSourceDescriptor()?.revision ?? -1) > attrRevision0, "refreshWasmAttributes() should bump scale revision");
    assert.strictEqual(gf.bindGroupKey, "gf:stable-wasm", "refreshWasmAttributes() should not invalidate a reused bind group");
    gf.upload(device, device.queue);
    assert.strictEqual(gf.bindGroupKey, "gf:stable-wasm", "wasmAttributes upload should not invalidate a reused bind group");
    arraysApproxEqual(await readF32(gf.attributesBuffer, 8, "gf:wasm:attributes:refresh:read"), attributes.data.subarray(0, 8), 0, "refreshWasmAttributes() upload mismatch");

    const coreRevision = gf.getScaleSourceDescriptor()?.revision ?? -1;
    positions.data.set([9, 8, 7, 0], 4);
    rotations.data.set([0, 0, 0, 1], 4);
    scales.data.set([3, 3, 3, 0], 4);
    gf.refreshWasmPositions();
    gf.refreshWasmRotations();
    gf.refreshWasmScales();
    gf.upload(device, device.queue);
    assert.strictEqual(gf.getScaleSourceDescriptor()?.revision ?? -1, coreRevision, "Core wasm channel refreshes should not bump scale revision");
    assert.strictEqual(gf.bindGroupKey, "gf:stable-wasm", "Core same-buffer wasm uploads should not invalidate a reused bind group");
    gf.refreshFromWasm({ recomputeBounds: true });
    assert.strictEqual(gf.getLocalBounds().empty, false, "recomputeBounds should compute GlyphField bounds from external wasm sources");
    positions.data.set([-5, -6, -7, 0], 0);
    gf.refreshFromWasm({ recomputeBounds: true });
    assert.ok(gf.getLocalBounds().boxMin[0] < -4, "Repeated recomputeBounds should refresh active GlyphField wasm positions");
    gf.destroy?.();

    const explicitGlyph = new GlyphField({ wasmPositions: positions.view, wasmRotations: rotations.view, wasmScales: scales.view, boundsMin: [-3, -2, -1], boundsMax: [3, 2, 1], scaleTransform: baseScaleTransform });
    explicitGlyph.refreshFromWasm({ recomputeBounds: true });
    arraysApproxEqual(explicitGlyph.getLocalBounds().boxMin, [-3, -2, -1], 1e-6, "Explicit GlyphField bounds should not be overwritten by wasm recomputeBounds");
    explicitGlyph.destroy?.();

    const capacityPositions = makeView(20, "gf:wasm:capacity:positions", true);
    const capacityRotations = makeView(20, "gf:wasm:capacity:rotations");
    const capacityScales = makeView(20, "gf:wasm:capacity:scales");
    capacityPositions.data.set([1, 2, 3, 0, 4, 5, 6, 0, 7, 8, 9, 0, 10, 11, 12, 0, 13, 14, 15, 0]);
    capacityRotations.data.set([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    capacityScales.data.set([1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0]);
    const capacityField = new GlyphField({ wasmPositions: capacityPositions.view, wasmRotations: capacityRotations.view, wasmScales: capacityScales.view, instanceCount: 2, wasmCapacity: 4, scaleTransform: baseScaleTransform });
    assert.strictEqual(capacityField.instanceCount, 2, "Explicit instanceCount should override extra wasmPositions capacity");
    capacityField.upload(device, device.queue);
    const firstPositionsBuffer = capacityField.positionsBuffer;
    assert.ok(firstPositionsBuffer, "GlyphField wasm upload should allocate a positionsBuffer");
    assert.ok(firstPositionsBuffer.size >= 4 * 16, "wasmCapacity should be measured in glyph instances");
    arraysApproxEqual(await readF32(firstPositionsBuffer, 8, "gf:wasm:capacity:read"), capacityPositions.data.subarray(0, 8), 0, "Explicit instanceCount upload should use only the active range");
    capacityField.bindGroupKey = "gf:stable-capacity";
    capacityField.refreshWasmPositions({ instanceCount: 3 });
    capacityField.upload(device, device.queue);
    assert.strictEqual(capacityField.positionsBuffer, firstPositionsBuffer, "GlyphField should reuse wasm GPU capacity when active count fits");
    assert.strictEqual(capacityField.bindGroupKey, "gf:stable-capacity", "Reused wasm capacity should not invalidate the bind group");
    capacityField.refreshWasmPositions({ instanceCount: 5 });
    capacityField.upload(device, device.queue);
    assert.notStrictEqual(capacityField.positionsBuffer, firstPositionsBuffer, "GlyphField should grow wasm GPU capacity when active count exceeds capacity");
    assert.strictEqual(capacityField.bindGroupKey, null, "Growing wasm GPU capacity should invalidate the bind group");
    capacityField.refreshWasmPositions({ instanceCount: 5 });
    capacityPositions.lengthGlobal.value = 4;
    assert.throws(() => capacityField.upload(device, device.queue), /wasmPositions length must be at least instanceCount\*4/i, "upload() should validate refreshed wasmPositions length before reading");
    capacityField.destroy?.();

    const keepPositions = makeView(8, "gf:wasm:keepcpu:positions");
    const keepRotations = makeView(8, "gf:wasm:keepcpu:rotations");
    const keepScales = makeView(8, "gf:wasm:keepcpu:scales");
    const keepAttributes = makeView(8, "gf:wasm:keepcpu:attributes");
    keepPositions.data.set([1, 2, 3, 0, 4, 5, 6, 0]);
    keepRotations.data.set([0, 0, 0, 1, 0, 0, 0, 1]);
    keepScales.data.set([1, 1, 1, 0, 1, 1, 1, 0]);
    keepAttributes.data.set([1, 0, 0, 1, 0, 1, 0, 1]);
    const keepField = new GlyphField({ wasmPositions: keepPositions.view, wasmRotations: keepRotations.view, wasmScales: keepScales.view, wasmAttributes: keepAttributes.view, keepCPUData: true, scaleTransform: baseScaleTransform });
    arraysApproxEqual(keepField.getAttributeRecord(1), [0, 1, 0, 1], 1e-6, "keepCPUData=true should snapshot wasmAttributes");
    keepAttributes.data.set([0.3, 0.4, 0.5, 0.6], 4);
    arraysApproxEqual(keepField.getAttributeRecord(1), [0, 1, 0, 1], 1e-6, "Wasm attribute CPU records should be retained as copies");
    keepField.refreshFromWasm({ keepCPUData: true });
    arraysApproxEqual(keepField.getAttributeRecord(1), [0.3, 0.4, 0.5, 0.6], 1e-6, "refreshFromWasm() should refresh retained wasmAttributes");
    keepField.destroy?.();

    const invalidCases = [
        { message: "Invalid derived wasmPositions instanceCount should throw", error: /wasmPositions length must be a multiple of 4/i, create: () => new GlyphField({ wasmPositions: makeView(5, "gf:wasm:bad:positions:multiple").view, scaleTransform: baseScaleTransform }) },
        { message: "Short explicit-count wasmRotations should throw", error: /wasmRotations length must be at least instanceCount\*4/i, create: () => new GlyphField({ wasmPositions: makeView(8, "gf:wasm:bad:positions").view, wasmRotations: makeView(4, "gf:wasm:bad:rotations").view, wasmScales: makeView(8, "gf:wasm:bad:scales").view, instanceCount: 2, scaleTransform: baseScaleTransform }) },
        { message: "Short wasmAttributes should throw", error: /wasmAttributes length must be at least instanceCount\*4/i, create: () => new GlyphField({ wasmPositions: makeView(8, "gf:wasm:bad:attr:positions").view, wasmRotations: makeView(8, "gf:wasm:bad:attr:rotations").view, wasmScales: makeView(8, "gf:wasm:bad:attr:scales").view, wasmAttributes: makeView(4, "gf:wasm:bad:attributes").view, instanceCount: 2, scaleTransform: baseScaleTransform }) },
        { message: "Non-WasmMemoryView wasmPositions should throw", error: /wasmPositions must be a WasmMemoryView/i, create: () => new GlyphField({ wasmPositions: makeView(8, "gf:wasm:bad:source-type").data, scaleTransform: baseScaleTransform }) },
        { message: "Non-f32 wasmPositions should throw", error: /wasmPositions dtype must be 'f32'/i, create: () => { const memory = new WebAssembly.Memory({ initial: 1 }), moduleRef = WasmGPU.webassemblyInterop.fromMemory(memory, { name: "gf:wasm:bad:dtype" }); return new GlyphField({ wasmPositions: moduleRef.view({ ptr: 0, length: 8, dtype: "u32", name: "u32-positions" }), scaleTransform: baseScaleTransform }); } }
    ];
    for (const testCase of invalidCases) assert.throws(testCase.create, testCase.error, testCase.message);
}

// 3) External buffers are borrowed by default, owned when requested, and owned replacements are destroyed exactly once.
{
    const borrowed = createGlyphBufferSet("glyphfield:ownership:borrowed");
    const ownedByCtor = createGlyphBufferSet("glyphfield:ownership:ctor");
    const ownedBySetter = createGlyphBufferSet("glyphfield:ownership:setter");
    const replaceBorrowed = createGlyphBufferSet("glyphfield:ownership:replace:borrowed");
    const replaceOwnedA = createGlyphBufferSet("glyphfield:ownership:replace:owned-a");
    const replaceOwnedB = createGlyphBufferSet("glyphfield:ownership:replace:owned-b");
    const borrowedDestroyed = trackGlyphBufferDestroy(borrowed);
    const ctorDestroyed = trackGlyphBufferDestroy(ownedByCtor);
    const setterDestroyed = trackGlyphBufferDestroy(ownedBySetter);
    const replaceBorrowedDestroyed = trackGlyphBufferDestroy(replaceBorrowed);
    const replaceOwnedADestroyed = trackGlyphBufferDestroy(replaceOwnedA);
    const replaceOwnedBDestroyed = trackGlyphBufferDestroy(replaceOwnedB);

    new GlyphField(createExternalGlyphDescriptor(borrowed)).destroy?.();
    assertGlyphDestroyCounts(borrowedDestroyed, 0, "Expected default external GlyphField buffers to be borrowed");

    new GlyphField(createExternalGlyphDescriptor(ownedByCtor, { ownBuffers: true })).destroy?.();
    assertGlyphDestroyCounts(ctorDestroyed, 1, "Expected constructor ownBuffers to transfer GlyphField buffer ownership");

    const setterOwned = new GlyphField({ scaleTransform: baseScaleTransform });
    setExternalGlyphBuffers(setterOwned, ownedBySetter, { ownBuffers: true });
    setterOwned.destroy?.();
    assertGlyphDestroyCounts(setterDestroyed, 1, "Expected setter ownBuffers to transfer GlyphField buffer ownership");

    const replaced = new GlyphField({ scaleTransform: baseScaleTransform });
    setExternalGlyphBuffers(replaced, replaceBorrowed);
    setExternalGlyphBuffers(replaced, replaceOwnedA, { ownBuffers: true });
    setExternalGlyphBuffers(replaced, replaceOwnedB, { ownBuffers: true });
    replaced.destroy?.();
    assertGlyphDestroyCounts(replaceBorrowedDestroyed, 0, "Expected replaced borrowed GlyphField buffers to remain alive");
    assertGlyphDestroyCounts(replaceOwnedADestroyed, 1, "Expected replaced owned GlyphField buffers to be destroyed exactly once");
    assertGlyphDestroyCounts(replaceOwnedBDestroyed, 1, "Expected final owned GlyphField buffers to be destroyed exactly once");

    destroyExternalGlyphBuffers(borrowed);
    destroyExternalGlyphBuffers(replaceBorrowed);
}

// 4) WebAssembly-staged SoA path: setWasmSoA() -> upload() reads from WebAssembly memory into GPU buffers.
{
    const instanceCount = 2;
    const len4 = instanceCount * 4;
    const positions = new Float32Array([10.0, 20.0, 30.0, 0.0, 40.0, 50.0, 60.0, 0.0]);
    const rotations = new Float32Array([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.70710677, 0.70710677]);
    const scales = new Float32Array([1.0, 1.0, 1.0, 0.0, 3.0, 2.0, 1.0, 0.0]);
    const attributes = new Float32Array([0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.75]);
    const posPtr = wasm.allocF32(len4);
    const rotPtr = wasm.allocF32(len4);
    const sclPtr = wasm.allocF32(len4);
    const attrPtr = wasm.allocF32(len4);

    try {
        wasm.f32view(posPtr, len4).set(positions);
        wasm.f32view(rotPtr, len4).set(rotations);
        wasm.f32view(sclPtr, len4).set(scales);
        wasm.f32view(attrPtr, len4).set(attributes);

        const gf = new GlyphField({ scaleTransform: baseScaleTransform });
        assert.strictEqual(typeof gf.setWasmSoA, "function", "GlyphField.setWasmSoA missing");
        gf.setWasmSoA(posPtr, rotPtr, sclPtr, attrPtr, instanceCount);

        gf.upload(device, device.queue);

        assert.ok(gf.positionsBuffer, "GlyphField.positionsBuffer not created after wasm upload");
        assert.ok(gf.rotationsBuffer, "GlyphField.rotationsBuffer not created after wasm upload");
        assert.ok(gf.scalesBuffer, "GlyphField.scalesBuffer not created after wasm upload");
        assert.ok(gf.attributesBuffer, "GlyphField.attributesBuffer not created after wasm upload");

        const outPos = compute.createStorageBuffer({ label: "glyphfield:wasm:positions:out", byteLength: positions.byteLength, copySrc: true });
        const outRot = compute.createStorageBuffer({ label: "glyphfield:wasm:rotations:out", byteLength: rotations.byteLength, copySrc: true });
        const outScl = compute.createStorageBuffer({ label: "glyphfield:wasm:scales:out", byteLength: scales.byteLength, copySrc: true });
        const outAttr = compute.createStorageBuffer({ label: "glyphfield:wasm:attributes:out", byteLength: attributes.byteLength, copySrc: true });

        compute.kernels.copyF32(gf.positionsBuffer, { out: outPos, count: positions.length });
        compute.kernels.copyF32(gf.rotationsBuffer, { out: outRot, count: rotations.length });
        compute.kernels.copyF32(gf.scalesBuffer, { out: outScl, count: scales.length });
        compute.kernels.copyF32(gf.attributesBuffer, { out: outAttr, count: attributes.length });

        await device.queue.onSubmittedWorkDone();

        arraysApproxEqual(await outPos.readAs(Float32Array), positions, 0, "WebAssembly-uploaded positionsBuffer contents mismatch");
        arraysApproxEqual(await outRot.readAs(Float32Array), rotations, 0, "WebAssembly-uploaded rotationsBuffer contents mismatch");
        arraysApproxEqual(await outScl.readAs(Float32Array), scales, 0, "WebAssembly-uploaded scalesBuffer contents mismatch");
        arraysApproxEqual(await outAttr.readAs(Float32Array), attributes, 0, "WebAssembly-uploaded attributesBuffer contents mismatch");

        outPos.destroy();
        outRot.destroy();
        outScl.destroy();
        outAttr.destroy();
        gf.destroy?.();
    } finally { wasm.freeF32(posPtr, len4); wasm.freeF32(rotPtr, len4); wasm.freeF32(sclPtr, len4); wasm.freeF32(attrPtr, len4); }
}

// 5) Uniform packing sanity: unified ScaleTransform + visual/solid params.
{
    const gf = new GlyphField({ scaleTransform: baseScaleTransform });

    assert.strictEqual(typeof gf.getUniformBufferSize, "function", "GlyphField.getUniformBufferSize missing");
    assert.strictEqual(typeof gf.getUniformData, "function", "GlyphField.getUniformData missing");

    const byteSize = gf.getUniformBufferSize();
    assert.strictEqual(byteSize, 240, "GlyphField uniform buffer size should be 240 bytes (15 vec4<f32>)");

    assert.ok(("opacity" in gf), "GlyphField.opacity missing");
    assert.ok(("colormap" in gf), "GlyphField.colormap missing");
    assert.ok(("colorMode" in gf), "GlyphField.colorMode missing");
    assert.ok(("lit" in gf), "GlyphField.lit missing");
    assert.ok(("solidColor" in gf), "GlyphField.solidColor missing");
    assert.ok(("scaleTransform" in gf), "GlyphField.scaleTransform missing");
    assert.strictEqual(typeof gf.setScaleTransform, "function", "GlyphField.setScaleTransform missing");

    assert.strictEqual(gf.lit, false, "GlyphField.lit should default to false so glyph colors remain visible without scene lights");

    gf.opacity = 0.25;
    gf.colormap = "plasma";
    gf.colorMode = "scalar";
    gf.lit = false;
    gf.solidColor = [0.1, 0.2, 0.3, 0.4];
    gf.setScaleTransform({ componentCount: 4, componentIndex: 0, valueMode: "component", stride: 4, offset: 0, mode: "log", clampMode: "range", domainMin: 0.1, domainMax: 10, clampMin: 0.2, clampMax: 8, percentileLow: 5, percentileHigh: 95, logBase: 10, gamma: 2, invert: true });

    const u = gf.getUniformData();
    assert.ok(u instanceof Float32Array, "getUniformData() should return Float32Array");
    assert.strictEqual(u.byteLength, 240, "getUniformData() byteLength mismatch");

    numberApproxEqual(u[0], 4.0, 1e-6, "scaleSource.componentCount mismatch");
    numberApproxEqual(u[1], 0.0, 1e-6, "scaleSource.componentIndex mismatch");
    numberApproxEqual(u[3], 4.0, 1e-6, "scaleSource.stride mismatch");

    numberApproxEqual(u[4], 0.1, 1e-6, "scaleDomain.domainMin mismatch");
    numberApproxEqual(u[5], 10.0, 1e-6, "scaleDomain.domainMax mismatch");
    numberApproxEqual(u[7], 1.0, 1e-6, "scaleDomain.clampMode(range) mismatch");

    numberApproxEqual(u[8], 0.2, 1e-6, "scaleClamp.clampMin mismatch");
    numberApproxEqual(u[9], 8.0, 1e-6, "scaleClamp.clampMax mismatch");
    numberApproxEqual(u[12], 1.0, 1e-6, "scaleParams.mode(log) mismatch");
    numberApproxEqual(u[13], 10.0, 1e-6, "scaleParams.logBase mismatch");
    numberApproxEqual(u[15], 2.0, 1e-6, "scaleParams.gamma mismatch");
    numberApproxEqual(u[16], 1.0, 1e-6, "scaleFlags.invert mismatch");

    numberApproxEqual(u[20], 0.25, 1e-6, "visual.opacity mismatch");
    numberApproxEqual(u[22], 1.0, 1e-6, "visual.colorModeId(scalar) mismatch");
    numberApproxEqual(u[23], 0.0, 1e-6, "visual.lit flag mismatch");

    numberApproxEqual(u[24], 0.1, 1e-6, "solidColor.r mismatch");
    numberApproxEqual(u[25], 0.2, 1e-6, "solidColor.g mismatch");
    numberApproxEqual(u[26], 0.3, 1e-6, "solidColor.b mismatch");
    numberApproxEqual(u[27], 0.4, 1e-6, "solidColor.a mismatch");

    assert.ok(("dirtyUniforms" in gf), "GlyphField.dirtyUniforms missing");
    assert.strictEqual(typeof gf.markUniformsClean, "function", "GlyphField.markUniformsClean missing");

    gf.markUniformsClean();
    assert.strictEqual(!!gf.dirtyUniforms, false, "Expected dirtyUniforms to be false after markUniformsClean()");
    gf.setScaleTransform({ ...gf.scaleTransform, domainMin: 0.2 });
    assert.strictEqual(!!gf.dirtyUniforms, true, "Expected dirtyUniforms to become true after setScaleTransform()");

    gf.destroy?.();
}

// 6) Cleanup releases the shared compute context before its browser GPU device.
{
    compute.destroy();
    await destroyTestDevice(device);
}
