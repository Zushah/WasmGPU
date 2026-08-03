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

const { NodeLink, Compute, Scene, WasmGPU: Engine, WasmMemoryView } = WasmGPU;
assert.ok(NodeLink, "Missing export: NodeLink");
assert.ok(Compute, "Missing export: Compute");
assert.ok(Scene, "Missing export: Scene");
assert.ok(Engine, "Missing export: WasmGPU");
assert.ok(WasmMemoryView, "Missing export: WasmMemoryView");
assert.strictEqual(typeof Engine.prototype.createNodeLink, "function", "Missing API: WasmGPU.createNodeLink(descriptor)");

const compute = new Compute(device, device.queue);
assert.ok(compute.kernels && typeof compute.kernels.copyF32 === "function", "Missing kernel: copyF32");
assert.ok(typeof compute.kernels.copyU32 === "function", "Missing kernel: copyU32");
const { readBufferAsF32, readBufferAsU32 } = createBufferReaders(compute);

const createNodeLinkBufferSet = (label) => ({
    nodePositions: compute.createStorageBuffer({ label: `${label}:nodePositions`, data: new Float32Array([1.0, 2.0, 3.0, 0.0]), copySrc: false }),
    nodeScalars: compute.createStorageBuffer({ label: `${label}:nodeScalars`, data: new Float32Array([0.25]), copySrc: false }),
    edges: compute.createStorageBuffer({ label: `${label}:edges`, data: new Uint32Array([0, 0]), copySrc: false }),
    edgeColors: compute.createStorageBuffer({ label: `${label}:edgeColors`, data: new Float32Array([0.9, 0.8, 0.7, 1.0]), copySrc: false }),
    nodeCount: 1, edgeCount: 1
});

const trackNodeLinkBufferDestroy = (buffers) => ({
    nodePositions: trackDestroy(buffers.nodePositions.buffer),
    nodeScalars: trackDestroy(buffers.nodeScalars.buffer),
    edges: trackDestroy(buffers.edges.buffer),
    edgeColors: trackDestroy(buffers.edgeColors.buffer)
});

const assertNodeLinkDestroyCounts = (trackers, count, label) => { for (const [key, tracker] of Object.entries(trackers)) assert.strictEqual(tracker(), count, `${label}: ${key}`); };

const createExternalNodeLinkDescriptor = (buffers, extra = {}) => ({
    nodePositionsBuffer: buffers.nodePositions.buffer,
    nodeScalarsBuffer: buffers.nodeScalars.buffer,
    nodeCount: buffers.nodeCount,
    edgesBuffer: buffers.edges.buffer,
    edgeColorsBuffer: buffers.edgeColors.buffer,
    edgeCount: buffers.edgeCount,
    ...extra
});

const setExternalNodeLinkBuffers = (link, buffers, ownBuffer = false) => {
    link.setNodePositionsBuffer(buffers.nodePositions.buffer, buffers.nodeCount, { ownBuffer });
    link.setNodeScalarsBuffer(buffers.nodeScalars.buffer, { ownBuffer });
    link.setEdgesBuffer(buffers.edges.buffer, buffers.edgeCount, { ownBuffer });
    link.setEdgeColorsBuffer(buffers.edgeColors.buffer, { ownBuffer });
};

const destroyExternalNodeLinkBuffers = (buffers) => { buffers.nodePositions.destroy(); buffers.nodeScalars.destroy(); buffers.edges.destroy(); buffers.edgeColors.destroy(); };

// 1) Constructor / descriptor validation and mode enums.
{
    assert.throws(() => new NodeLink({ nodeGeometryMode: "foo" }), /nodeGeometryMode/, "Expected invalid nodeGeometryMode to throw");
    assert.throws(() => new NodeLink({ edgeGeometryMode: "foo" }), /edgeGeometryMode/, "Expected invalid edgeGeometryMode to throw");
    assert.throws(() => new NodeLink({ nodeColorMode: "foo" }), /nodeColorMode/, "Expected invalid nodeColorMode to throw");
    assert.throws(() => new NodeLink({ edgeColorMode: "foo" }), /edgeColorMode/, "Expected invalid edgeColorMode to throw");
    const extPos = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const extEdges = device.createBuffer({ size: 8, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    try {
        assert.throws(() => new NodeLink({ nodePositionsBuffer: extPos }), /nodeCount is required/, "Expected nodeCount requirement for nodePositionsBuffer");
        assert.throws(() => new NodeLink({ edgesBuffer: extEdges }), /edgeCount is required/, "Expected edgeCount requirement for edgesBuffer");
    } finally { extPos.destroy(); extEdges.destroy(); }
    assert.throws(() => new NodeLink({ nodePositions: new Float32Array([0, 0, 0]), edges: new Uint32Array([0, 2]) }), /out of range/, "Expected out-of-range edge index validation");
    assert.throws(() => new NodeLink({ nodePositions: new Float32Array([0, 0, 0, 1, 1, 1]), edges: [0, 1] }), /Uint16Array|Uint32Array/, "Expected typed-array validation for edges");
}

// 2) CPU upload path: positions/edges/scalars/colors/radii upload and own the created buffers.
{
    const link = new NodeLink({
        nodePositions: new Float32Array([0.0, 0.0, 0.0, 1.0, 2.0, 3.0, -2.0, 1.0, 0.5]),
        nodePositionsStride: 3,
        nodeRadii: new Float32Array([0.5, 0.5, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5]),
        nodeRadiiStride: 3,
        edges: new Uint16Array([0, 1, 1, 2]),
        nodeScalars: new Float32Array([0.10, 0.20, 0.30]),
        edgeScalars: new Float32Array([0.45, 0.65]),
        nodeColors: new Float32Array([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1]),
        edgeColors: new Float32Array([1, 1, 1, 1, 0.4, 0.4, 0.4, 1]),
        keepCPUData: true,
        nodeScaleTransform: { componentCount: 1, componentIndex: 0, stride: 1, offset: 0 },
        edgeScaleTransform: { componentCount: 1, componentIndex: 0, stride: 1, offset: 0 }
    });

    link.upload(device, device.queue);
    assert.ok(link.nodePositionsBuffer, "NodeLink.nodePositionsBuffer missing after upload");
    assert.ok(link.edgesBuffer, "NodeLink.edgesBuffer missing after upload");
    assert.ok(link.nodeRadiiBuffer, "NodeLink.nodeRadiiBuffer missing after upload");

    arraysApproxEqual(await readBufferAsF32(link.nodePositionsBuffer, 12), new Float32Array([0.0, 0.0, 0.0, 0.0, 1.0, 2.0, 3.0, 0.0, -2.0, 1.0, 0.5, 0.0]), 0, "CPU node positions upload mismatch");
    arraysApproxEqual(await readBufferAsF32(link.nodeRadiiBuffer, 12), new Float32Array([0.5, 0.5, 0.5, 0.0, 1.0, 1.5, 2.0, 0.0, 2.5, 3.0, 3.5, 0.0]), 0, "CPU node radii upload mismatch");
    assert.deepStrictEqual(Array.from(await readBufferAsU32(link.edgesBuffer, 4)), [0, 1, 1, 2], "CPU edge index upload mismatch");

    const nodeScaleSource = link.getNodeScaleSourceDescriptor();
    const edgeScaleSource = link.getEdgeScaleSourceDescriptor();
    assert.ok(nodeScaleSource, "Expected node scale source descriptor after upload");
    assert.ok(edgeScaleSource, "Expected edge scale source descriptor after upload");
    assert.strictEqual(nodeScaleSource.count, 3, "Node scale source count mismatch");
    assert.strictEqual(edgeScaleSource.count, 2, "Edge scale source count mismatch");

    link.destroy();
}

// 3) External WebAssembly memory views: per-channel refresh, source-kind mixing, CPU snapshots, validation, and grow-only capacity.
{
    const makeView = (length, dtype = "f32", name = "nodelink-wasm-view", capacity = 64) => {
        const memory = new WebAssembly.Memory({ initial: 1 });
        const lengthGlobal = new WebAssembly.Global({ value: "i32", mutable: true }, length);
        const moduleRef = WasmGPU.webassemblyInterop.fromMemory(memory, { name });
        const data = dtype === "u32" ? new Uint32Array(memory.buffer, 0, capacity) : new Float32Array(memory.buffer, 0, capacity);
        const view = moduleRef.view({ ptr: 0, length: { global: lengthGlobal }, dtype, name });
        assert.ok(view instanceof WasmMemoryView, "Expected fromMemory().view() to return a WasmMemoryView");
        return { memory, moduleRef, lengthGlobal, data, view };
    };

    const nodePositions = makeView(8, "f32", "nl:wasm:nodePositions");
    const nodeScalars = makeView(2, "f32", "nl:wasm:nodeScalars");
    const nodeColors = makeView(8, "f32", "nl:wasm:nodeColors");
    const nodeRadii = makeView(8, "f32", "nl:wasm:nodeRadii");
    const edges = makeView(4, "u32", "nl:wasm:edges");
    const edgeScalars = makeView(2, "f32", "nl:wasm:edgeScalars");
    const edgeColors = makeView(8, "f32", "nl:wasm:edgeColors");
    nodePositions.data.set([0, 0, 0, 0, 1, 2, 3, 0]);
    nodeScalars.data.set([0.25, 0.75]);
    nodeColors.data.set([1, 0, 0, 1, 0, 1, 0, 1]);
    nodeRadii.data.set([0.5, 0.5, 0.5, 0, 1, 1, 1, 0]);
    edges.data.set([0, 1, 1, 0]);
    edgeScalars.data.set([0.4, 0.8]);
    edgeColors.data.set([1, 1, 1, 1, 0.3, 0.4, 0.5, 1]);

    const link = new NodeLink({
        wasmNodePositions: nodePositions.view,
        wasmNodeScalars: nodeScalars.view,
        wasmNodeColors: nodeColors.view,
        wasmNodeRadii: nodeRadii.view,
        wasmEdges: edges.view,
        wasmEdgeScalars: edgeScalars.view,
        wasmEdgeColors: edgeColors.view,
        nodeScaleTransform: { componentCount: 1, componentIndex: 0, stride: 1, offset: 0 },
        edgeScaleTransform: { componentCount: 1, componentIndex: 0, stride: 1, offset: 0 }
    });
    assert.strictEqual(link.nodeCount, 2, "NodeLink should derive nodeCount from wasmNodePositions");
    assert.strictEqual(link.edgeCount, 2, "NodeLink should derive edgeCount from wasmEdges");
    assert.strictEqual(link.getNodeRecord(0), null, "Default wasm node path should not retain CPU node records");
    assert.strictEqual(link.getEdgeRecord(0), null, "Default wasm edge path should not retain CPU edge records");
    assert.deepStrictEqual([link.getLocalBounds().empty, link.getLocalBounds().partial], [true, true], "Default external-wasm NodeLink bounds should stay partial until recomputed");
    link.upload(device, device.queue);
    arraysApproxEqual(await readBufferAsF32(link.nodePositionsBuffer, 8), nodePositions.data.subarray(0, 8), 0, "wasmNodePositions upload mismatch");
    arraysApproxEqual(await readBufferAsF32(link.nodeScalarsBuffer, 2), nodeScalars.data.subarray(0, 2), 0, "wasmNodeScalars upload mismatch");
    arraysApproxEqual(await readBufferAsF32(link.nodeColorsBuffer, 8), nodeColors.data.subarray(0, 8), 0, "wasmNodeColors upload mismatch");
    arraysApproxEqual(await readBufferAsF32(link.nodeRadiiBuffer, 8), nodeRadii.data.subarray(0, 8), 0, "wasmNodeRadii upload mismatch");
    assert.deepStrictEqual(Array.from(await readBufferAsU32(link.edgesBuffer, 4)), [0, 1, 1, 0], "wasmEdges upload mismatch");
    arraysApproxEqual(await readBufferAsF32(link.edgeColorsBuffer, 8), edgeColors.data.subarray(0, 8), 0, "wasmEdgeColors upload mismatch");

    const nodeRevision0 = link.getNodeScaleSourceDescriptor()?.revision ?? -1;
    const edgeRevision0 = link.getEdgeScaleSourceDescriptor()?.revision ?? -1;
    link.bindGroupKey = "nl:stable-wasm";
    nodeScalars.data[1] = 0.9;
    edgeScalars.data[0] = 0.55;
    link.refreshWasmNodeScalars();
    link.refreshWasmEdgeScalars();
    assert.ok((link.getNodeScaleSourceDescriptor()?.revision ?? -1) > nodeRevision0, "refreshWasmNodeScalars() should bump node scale revision");
    assert.ok((link.getEdgeScaleSourceDescriptor()?.revision ?? -1) > edgeRevision0, "refreshWasmEdgeScalars() should bump edge scale revision");
    assert.strictEqual(link.bindGroupKey, "nl:stable-wasm", "wasm scalar refresh should not invalidate a reused bind group");
    link.upload(device, device.queue);
    assert.strictEqual(link.bindGroupKey, "nl:stable-wasm", "same-buffer wasm uploads should not invalidate a reused bind group");
    arraysApproxEqual(await readBufferAsF32(link.nodeScalarsBuffer, 2), nodeScalars.data.subarray(0, 2), 0, "Refreshed wasmNodeScalars upload mismatch");
    arraysApproxEqual(await readBufferAsF32(link.edgeScalarsBuffer, 2), edgeScalars.data.subarray(0, 2), 0, "Refreshed wasmEdgeScalars upload mismatch");
    nodePositions.data.set([2, 3, 4, 0, 5, 6, 7, 0]);
    link.refreshWasmNodePositions({ nodeCount: 2, recomputeBounds: true });
    arraysApproxEqual(link.boundsMax, [5, 6, 7], 1e-6, "recomputeBounds should use active external wasm node positions");
    nodePositions.data.set([-4, -5, -6, 0, 1, 2, 3, 0]);
    link.refreshWasmNodePositions({ nodeCount: 2, recomputeBounds: true });
    arraysApproxEqual(link.boundsMin, [-4, -5, -6], 1e-6, "Repeated recomputeBounds should refresh NodeLink wasm bounds");
    link.destroy();

    const explicitLink = new NodeLink({ wasmNodePositions: nodePositions.view, nodeCount: 2, boundsMin: [-1, -1, -1], boundsMax: [1, 1, 1] });
    explicitLink.refreshWasmNodePositions({ nodeCount: 2, recomputeBounds: true });
    arraysApproxEqual(explicitLink.boundsMin, [-1, -1, -1], 1e-6, "Explicit NodeLink bounds should not be overwritten by wasm recomputeBounds");
    explicitLink.destroy();

    const mixedNodeScalars = makeView(2, "f32", "nl:wasm:mixed:nodeScalars");
    const mixedEdgeColors = makeView(4, "f32", "nl:wasm:mixed:edgeColors");
    mixedNodeScalars.data.set([0.1, 0.2]);
    mixedEdgeColors.data.set([0.7, 0.6, 0.5, 1]);
    const mixedEdges = compute.createStorageBuffer({ label: "nl:wasm:mixed:edges", data: new Uint32Array([0, 1]), copySrc: false });
    const mixed = new NodeLink({
        nodePositions: new Float32Array([0, 0, 0, 1, 0, 0]),
        wasmNodeScalars: mixedNodeScalars.view,
        edgesBuffer: mixedEdges.buffer,
        edgeCount: 1,
        wasmEdgeColors: mixedEdgeColors.view
    });
    mixed.upload(device, device.queue);
    arraysApproxEqual(await readBufferAsF32(mixed.nodeScalarsBuffer, 2), mixedNodeScalars.data.subarray(0, 2), 0, "Mixed CPU nodes + wasmNodeScalars upload mismatch");
    arraysApproxEqual(await readBufferAsF32(mixed.edgeColorsBuffer, 4), mixedEdgeColors.data.subarray(0, 4), 0, "Mixed external edges + wasmEdgeColors upload mismatch");
    mixed.destroy();
    mixedEdges.destroy();

    const capacityPositions = makeView(20, "f32", "nl:wasm:capacity:positions");
    capacityPositions.data.set([0, 0, 0, 0, 1, 1, 1, 0, 2, 2, 2, 0, 3, 3, 3, 0, 4, 4, 4, 0]);
    const capacity = new NodeLink({ wasmNodePositions: capacityPositions.view, nodeCount: 2, wasmNodeCapacity: 4 });
    capacity.upload(device, device.queue);
    const firstPositionsBuffer = capacity.nodePositionsBuffer;
    assert.ok(firstPositionsBuffer, "NodeLink wasmNodePositions upload should allocate a nodePositionsBuffer");
    assert.ok(firstPositionsBuffer.size >= 4 * 16, "wasmNodeCapacity should be measured in node records");
    capacity.bindGroupKey = "nl:stable-capacity";
    capacity.refreshWasmNodePositions({ nodeCount: 3 });
    capacity.upload(device, device.queue);
    assert.strictEqual(capacity.nodePositionsBuffer, firstPositionsBuffer, "NodeLink should reuse wasm node capacity when active count fits");
    assert.strictEqual(capacity.bindGroupKey, "nl:stable-capacity", "Reused wasm node capacity should not invalidate the bind group");
    capacity.refreshWasmNodePositions({ nodeCount: 5 });
    capacity.upload(device, device.queue);
    assert.notStrictEqual(capacity.nodePositionsBuffer, firstPositionsBuffer, "NodeLink should grow wasm node capacity when active count exceeds capacity");
    assert.strictEqual(capacity.bindGroupKey, null, "Growing wasm node capacity should invalidate the bind group");
    capacity.destroy();

    const keepPositions = makeView(8, "f32", "nl:wasm:keep:positions");
    const keepScalars = makeView(2, "f32", "nl:wasm:keep:scalars");
    const keepEdges = makeView(2, "u32", "nl:wasm:keep:edges");
    const keepEdgeColors = makeView(4, "f32", "nl:wasm:keep:edgeColors");
    keepPositions.data.set([4, 5, 6, 0, 7, 8, 9, 0]);
    keepScalars.data.set([0.4, 0.8]);
    keepEdges.data.set([0, 1]);
    keepEdgeColors.data.set([0.2, 0.3, 0.4, 1]);
    const keep = new NodeLink({ wasmNodePositions: keepPositions.view, wasmNodeScalars: keepScalars.view, wasmEdges: keepEdges.view, wasmEdgeColors: keepEdgeColors.view, keepCPUData: true });
    assert.deepStrictEqual(keep.getNodeRecord(1), { position: [7, 8, 9], scalar: 0.800000011920929, color: null }, "keepCPUData should snapshot wasm node records");
    const edgeRecord = keep.getEdgeRecord(0);
    assert.ok(edgeRecord, "keepCPUData should snapshot wasm edge records");
    assert.deepStrictEqual([edgeRecord.src, edgeRecord.dst, edgeRecord.srcPosition, edgeRecord.dstPosition], [0, 1, [4, 5, 6], [7, 8, 9]], "Wasm edge CPU snapshot mismatch");
    keepPositions.data.set([70, 80, 90, 0], 4);
    assert.deepStrictEqual(keep.getNodeRecord(1).position, [7, 8, 9], "Wasm CPU records should be retained as copies");
    keep.refreshFromWasm({ keepCPUData: true });
    assert.deepStrictEqual(keep.getNodeRecord(1).position, [70, 80, 90], "refreshFromWasm() should refresh retained CPU node data");
    keep.destroy();

    const shrinkPositions = makeView(8, "f32", "nl:wasm:shrink:positions");
    shrinkPositions.data.set([0, 0, 0, 0, 1, 1, 1, 0]);
    const shrink = new NodeLink({ wasmNodePositions: shrinkPositions.view, nodeCount: 2 });
    shrink.upload(device, device.queue);
    shrink.refreshWasmNodePositions({ nodeCount: 2 });
    shrinkPositions.lengthGlobal.value = 4;
    assert.throws(() => shrink.upload(device, device.queue), /wasmNodePositions length must be at least nodeCount\*4/i, "upload() should validate refreshed wasmNodePositions length before reading");
    shrink.destroy();

    const invalidCases = [
        { message: "Invalid derived wasmNodePositions nodeCount should throw", error: /wasmNodePositions length must be a multiple of 4/i, create: () => new NodeLink({ wasmNodePositions: makeView(5, "f32", "nl:wasm:bad:nodePositions").view }) },
        { message: "Short wasmEdgeColors should throw", error: /wasmEdgeColors length must be at least edgeCount\*4/i, create: () => new NodeLink({ wasmEdgeColors: makeView(4, "f32", "nl:wasm:bad:edgeColors").view, edgeCount: 2 }) },
        { message: "Non-WasmMemoryView wasmNodeScalars should throw", error: /wasmNodeScalars must be a WasmMemoryView/i, create: () => new NodeLink({ wasmNodeScalars: makeView(2, "f32", "nl:wasm:bad:source-type").data, nodeCount: 2 }) },
        { message: "Non-f32 wasmNodePositions should throw", error: /wasmNodePositions dtype must be 'f32'/i, create: () => new NodeLink({ wasmNodePositions: makeView(8, "u32", "nl:wasm:bad:node-dtype").view }) },
        { message: "Non-u32 wasmEdges should throw", error: /wasmEdges dtype must be 'u32'/i, create: () => new NodeLink({ wasmEdges: makeView(2, "f32", "nl:wasm:bad:edge-dtype").view }) }
    ];
    for (const testCase of invalidCases) assert.throws(testCase.create, testCase.error, testCase.message);
}

// 4) External buffers are borrowed by default, owned when requested, and owned replacements are destroyed exactly once.
{
    const borrowed = createNodeLinkBufferSet("nodelink:ownership:borrowed");
    const ownedByCtor = createNodeLinkBufferSet("nodelink:ownership:ctor");
    const ownedBySetter = createNodeLinkBufferSet("nodelink:ownership:setter");
    const replaceBorrowed = createNodeLinkBufferSet("nodelink:ownership:replace:borrowed");
    const replaceOwnedA = createNodeLinkBufferSet("nodelink:ownership:replace:owned-a");
    const replaceOwnedB = createNodeLinkBufferSet("nodelink:ownership:replace:owned-b");
    const borrowedDestroyed = trackNodeLinkBufferDestroy(borrowed);
    const ctorDestroyed = trackNodeLinkBufferDestroy(ownedByCtor);
    const setterDestroyed = trackNodeLinkBufferDestroy(ownedBySetter);
    const replaceBorrowedDestroyed = trackNodeLinkBufferDestroy(replaceBorrowed);
    const replaceOwnedADestroyed = trackNodeLinkBufferDestroy(replaceOwnedA);
    const replaceOwnedBDestroyed = trackNodeLinkBufferDestroy(replaceOwnedB);

    new NodeLink(createExternalNodeLinkDescriptor(borrowed)).destroy();
    assertNodeLinkDestroyCounts(borrowedDestroyed, 0, "Expected default external NodeLink buffers to be borrowed");

    new NodeLink(createExternalNodeLinkDescriptor(ownedByCtor, { ownBuffers: true })).destroy();
    assertNodeLinkDestroyCounts(ctorDestroyed, 1, "Expected constructor ownBuffers to transfer NodeLink buffer ownership");

    const setterOwned = new NodeLink();
    setExternalNodeLinkBuffers(setterOwned, ownedBySetter, true);
    setterOwned.destroy();
    assertNodeLinkDestroyCounts(setterDestroyed, 1, "Expected setter ownBuffer to transfer NodeLink buffer ownership");

    const replaced = new NodeLink();
    setExternalNodeLinkBuffers(replaced, replaceBorrowed);
    setExternalNodeLinkBuffers(replaced, replaceOwnedA, true);
    setExternalNodeLinkBuffers(replaced, replaceOwnedB, true);
    replaced.destroy();
    assertNodeLinkDestroyCounts(replaceBorrowedDestroyed, 0, "Expected replaced borrowed NodeLink buffers to remain alive");
    assertNodeLinkDestroyCounts(replaceOwnedADestroyed, 1, "Expected replaced owned NodeLink buffers to be destroyed exactly once");
    assertNodeLinkDestroyCounts(replaceOwnedBDestroyed, 1, "Expected final owned NodeLink buffers to be destroyed exactly once");

    destroyExternalNodeLinkBuffers(borrowed);
    destroyExternalNodeLinkBuffers(replaceBorrowed);
}

// 5) Streaming updates: only requested node/edge ranges mutate.
{
    const link = new NodeLink({
        nodePositions: new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0]),
        edges: new Uint16Array([0, 1, 1, 2, 2, 3]),
        nodeScalars: new Float32Array([0.1, 0.2, 0.3, 0.4]),
        edgeScalars: new Float32Array([0.5, 0.6, 0.7]),
        nodeColors: new Float32Array([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1]),
        edgeColors: new Float32Array([0.1, 0.1, 0.1, 1, 0.2, 0.2, 0.2, 1, 0.3, 0.3, 0.3, 1]),
        keepCPUData: true
    });
    link.upload(device, device.queue);

    link.updateNodePositions(new Float32Array([9, 9, 9]), 1, 3);
    link.updateEdges(new Uint16Array([3, 0]), 1);
    link.updateNodeScalars(new Float32Array([0.22, 0.33]), 1);
    link.updateEdgeScalars(new Float32Array([0.77]), 2);
    link.updateNodeColors(new Float32Array([0.4, 0.5, 0.6, 0.7]), 2);
    link.updateEdgeColors(new Float32Array([0.9, 0.8, 0.7, 1.0]), 0);
    link.upload(device, device.queue);

    const outPos = compute.createStorageBuffer({ label: "nodelink:update:pos:out", byteLength: 16 * 4, copySrc: true });
    const outEdges = compute.createStorageBuffer({ label: "nodelink:update:edges:out", byteLength: 4 * 6, copySrc: true });
    const outNodeScalars = compute.createStorageBuffer({ label: "nodelink:update:nodeScalars:out", byteLength: 4 * 4, copySrc: true });
    const outEdgeScalars = compute.createStorageBuffer({ label: "nodelink:update:edgeScalars:out", byteLength: 4 * 3, copySrc: true });
    const outNodeColors = compute.createStorageBuffer({ label: "nodelink:update:nodeColors:out", byteLength: 4 * 16, copySrc: true });
    const outEdgeColors = compute.createStorageBuffer({ label: "nodelink:update:edgeColors:out", byteLength: 4 * 12, copySrc: true });
    compute.kernels.copyF32(link.nodePositionsBuffer, { out: outPos, count: 16 });
    compute.kernels.copyU32(link.edgesBuffer, { out: outEdges, count: 6 });
    compute.kernels.copyF32(link.nodeScalarsBuffer, { out: outNodeScalars, count: 4 });
    compute.kernels.copyF32(link.edgeScalarsBuffer, { out: outEdgeScalars, count: 3 });
    compute.kernels.copyF32(link.nodeColorsBuffer, { out: outNodeColors, count: 16 });
    compute.kernels.copyF32(link.edgeColorsBuffer, { out: outEdgeColors, count: 12 });
    await device.queue.onSubmittedWorkDone();

    arraysApproxEqual(await outPos.readAs(Float32Array), new Float32Array([0, 0, 0, 0, 9, 9, 9, 0, 2, 0, 0, 0, 3, 0, 0, 0]), 0, "Partial node position update mismatch");
    assert.deepStrictEqual(Array.from(await outEdges.readAs(Uint32Array)), [0, 1, 3, 0, 2, 3], "Partial edge update mismatch");
    arraysApproxEqual(await outNodeScalars.readAs(Float32Array), new Float32Array([0.1, 0.22, 0.33, 0.4]), 0, "Partial node scalar update mismatch");
    arraysApproxEqual(await outEdgeScalars.readAs(Float32Array), new Float32Array([0.5, 0.6, 0.77]), 0, "Partial edge scalar update mismatch");
    arraysApproxEqual(await outNodeColors.readAs(Float32Array), new Float32Array([1, 0, 0, 1, 0, 1, 0, 1, 0.4, 0.5, 0.6, 0.7, 1, 1, 1, 1]), 0, "Partial node color update mismatch");
    arraysApproxEqual(await outEdgeColors.readAs(Float32Array), new Float32Array([0.9, 0.8, 0.7, 1, 0.2, 0.2, 0.2, 1, 0.3, 0.3, 0.3, 1]), 0, "Partial edge color update mismatch");

    outPos.destroy();
    outEdges.destroy();
    outNodeScalars.destroy();
    outEdgeScalars.destroy();
    outNodeColors.destroy();
    outEdgeColors.destroy();
    link.destroy();
}

// 6) Uniform packing sanity for independent node/edge scale and colormap channels.
{
    const link = new NodeLink({
        nodePositions: new Float32Array([0, 0, 0, 1, 0, 0]),
        edges: new Uint16Array([0, 1]),
        nodeScalars: new Float32Array([0.2, 0.8]),
        edgeScalars: new Float32Array([0.5]),
        nodeRadii: new Float32Array([1, 2, 3, 2, 2, 2]),
        keepCPUData: true
    });
    link.nodeGeometryMode = "ellipsoids";
    link.edgeGeometryMode = "cylinders";
    link.nodeColorMode = "scalar";
    link.edgeColorMode = "scalar";
    link.nodeColormap = "custom";
    link.nodeColormapStops = [[1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1]];
    link.edgeColormap = "custom";
    link.edgeColormapStops = [[0.2, 0.2, 0.9, 1], [0.9, 0.2, 0.2, 1]];
    link.nodeSolidColor = [0.1, 0.2, 0.3, 0.4];
    link.edgeSolidColor = [0.8, 0.7, 0.6, 0.5];
    link.nodeSize = 1.5;
    link.edgeSize = 0.15;
    link.opacity = 0.35;
    link.lit = true;
    link.minPointSize = 2.5;
    link.maxPointSize = 9.5;
    link.pointSizeAttenuation = 6.0;
    link.setNodeScaleTransform({ componentCount: 1, componentIndex: 0, stride: 1, offset: 0, mode: "symlog", clampMode: "range", domainMin: -5, domainMax: 5, clampMin: -2, clampMax: 2, symlogLinThresh: 0.5, gamma: 2 });
    link.setEdgeScaleTransform({ componentCount: 1, componentIndex: 0, stride: 1, offset: 0, mode: "log", clampMode: "range", domainMin: 0.1, domainMax: 10, clampMin: 0.2, clampMax: 8, logBase: 10, gamma: 1.5 });
    link.upload(device, device.queue);

    assert.strictEqual(link.getUniformBufferSize(), 512, "NodeLink uniform size must be 512 bytes");
    const u = link.getUniformData();
    assert.strictEqual(u.byteLength, 512, "NodeLink uniform byteLength mismatch");

    numberApproxEqual(u[0], 1.5, 1e-6, "global.nodeSize mismatch");
    numberApproxEqual(u[1], 0.15, 1e-6, "global.edgeSize mismatch");
    numberApproxEqual(u[2], 0.35, 1e-6, "global.opacity mismatch");
    numberApproxEqual(u[3], 1.0, 1e-6, "global.lit mismatch");

    numberApproxEqual(u[4], 1.0, 1e-6, "nodeScale.componentCount mismatch");
    numberApproxEqual(u[5], 0.0, 1e-6, "nodeScale.componentIndex mismatch");
    numberApproxEqual(u[8], -5.0, 1e-6, "nodeScale.domainMin mismatch");
    numberApproxEqual(u[9], 5.0, 1e-6, "nodeScale.domainMax mismatch");
    numberApproxEqual(u[12], -2.0, 1e-6, "nodeScale.clampMin mismatch");
    numberApproxEqual(u[13], 2.0, 1e-6, "nodeScale.clampMax mismatch");
    numberApproxEqual(u[24], 1.0, 1e-6, "nodeVisual.colorMode(scalar) mismatch");
    numberApproxEqual(u[25], 3.0, 1e-6, "nodeVisual.customStopCount mismatch");
    numberApproxEqual(u[26], 2.0, 1e-6, "nodeVisual.geometryMode(ellipsoids) mismatch");
    numberApproxEqual(u[27], 1.0, 1e-6, "nodeVisual.radiiEnabled mismatch");

    numberApproxEqual(u[28], 1.0, 1e-6, "edgeScale.componentCount mismatch");
    numberApproxEqual(u[32], 0.1, 1e-6, "edgeScale.domainMin mismatch");
    numberApproxEqual(u[33], 10.0, 1e-6, "edgeScale.domainMax mismatch");
    numberApproxEqual(u[48], 1.0, 1e-6, "edgeVisual.colorMode(scalar) mismatch");
    numberApproxEqual(u[49], 2.0, 1e-6, "edgeVisual.customStopCount mismatch");
    numberApproxEqual(u[50], 1.0, 1e-6, "edgeVisual.geometryMode(cylinders) mismatch");

    numberApproxEqual(u[52], 0.1, 1e-6, "nodeSolid.r mismatch");
    numberApproxEqual(u[53], 0.2, 1e-6, "nodeSolid.g mismatch");
    numberApproxEqual(u[54], 0.3, 1e-6, "nodeSolid.b mismatch");
    numberApproxEqual(u[55], 0.4, 1e-6, "nodeSolid.a mismatch");
    numberApproxEqual(u[56], 0.8, 1e-6, "edgeSolid.r mismatch");
    numberApproxEqual(u[57], 0.7, 1e-6, "edgeSolid.g mismatch");
    numberApproxEqual(u[58], 0.6, 1e-6, "edgeSolid.b mismatch");
    numberApproxEqual(u[59], 0.5, 1e-6, "edgeSolid.a mismatch");
    numberApproxEqual(u[60], 2.5, 1e-6, "pointParams.minPointSize mismatch");
    numberApproxEqual(u[61], 9.5, 1e-6, "pointParams.maxPointSize mismatch");
    numberApproxEqual(u[62], 6.0, 1e-6, "pointParams.attenuation mismatch");

    numberApproxEqual(u[64], 1.0, 1e-6, "node stop[0].r mismatch");
    numberApproxEqual(u[65], 0.0, 1e-6, "node stop[0].g mismatch");
    numberApproxEqual(u[66], 0.0, 1e-6, "node stop[0].b mismatch");
    numberApproxEqual(u[68], 0.0, 1e-6, "node stop[1].r mismatch");
    numberApproxEqual(u[69], 1.0, 1e-6, "node stop[1].g mismatch");
    numberApproxEqual(u[96], 0.2, 1e-6, "edge stop[0].r mismatch");
    numberApproxEqual(u[97], 0.2, 1e-6, "edge stop[0].g mismatch");
    numberApproxEqual(u[98], 0.9, 1e-6, "edge stop[0].b mismatch");

    link.destroy();
}

// 7) Bounds + Scene aggregate and traversal support.
{
    const linkA = new NodeLink({ nodePositions: new Float32Array([-1, -2, -3, 4, 5, 6]), edges: new Uint16Array([0, 1]), keepCPUData: true });
    const linkB = new NodeLink({ nodePositions: new Float32Array([10, 0, 0, 11, 0, 0]), edges: new Uint16Array([0, 1]), keepCPUData: true });
    linkA.transform.setPosition(2, 0, 0);
    linkB.visible = false;

    const worldA = linkA.getWorldBounds();
    assert.strictEqual(worldA.empty, false, "NodeLink world bounds should be non-empty with CPU positions");
    numberApproxEqual(worldA.sphereCenter[0], 3.5, 1e-6, "NodeLink world bounds center.x mismatch after transform");
    assert.ok(worldA.sphereRadius > 0, "NodeLink world bounds radius should be positive");
    assert.ok(worldA.boxMin[0] <= 1, "NodeLink world bounds min.x should include transformed geometry");
    assert.ok(worldA.boxMax[0] >= 6, "NodeLink world bounds max.x should include transformed geometry");

    const scene = new Scene();
    scene.add(linkA).add(linkB);
    const visibleBounds = scene.getBounds({ visibleOnly: true });
    const allBounds = scene.getBounds({ visibleOnly: false });
    assert.strictEqual(visibleBounds.empty, false, "Visible bounds should include visible NodeLink");
    assert.ok(visibleBounds.boxMin[0] <= 1, "Scene visible bounds min.x should include transformed NodeLink");
    assert.ok(visibleBounds.boxMax[0] >= 6, "Scene visible bounds max.x should include transformed NodeLink");
    assert.ok(allBounds.boxMax[0] >= 11, "Scene full bounds should include hidden NodeLink when visibleOnly=false");

    let traverseCount = 0;
    let traverseVisibleCount = 0;
    scene.traverseNodeLinks(() => { traverseCount++; });
    scene.traverseVisibleNodeLinks(() => { traverseVisibleCount++; });
    assert.strictEqual(traverseCount, 2, "Scene.traverseNodeLinks should visit all NodeLinks");
    assert.strictEqual(traverseVisibleCount, 1, "Scene.traverseVisibleNodeLinks should visit only visible NodeLinks");
    assert.strictEqual(scene.findNodeLinkByName("missing"), undefined, "findNodeLinkByName should return undefined for missing names");

    scene.clearNodeLinks();
    assert.strictEqual(scene.nodeLinks.length, 0, "Scene.clearNodeLinks should remove all NodeLinks");
    linkA.destroy();
    linkB.destroy();
}

// 8) Cleanup releases the shared compute context before its browser GPU device.
{
    compute.destroy();
    await destroyTestDevice(device);
}
