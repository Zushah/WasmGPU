/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, destroyTestDevice, safelySilence, setupTest } from "./utils/helpers.js";
import { initWebAssembly, Geometry, wasm, webassemblyInterop, WasmMemoryView } from "../release/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers();

const { device } = await setupTest({ initWebAssembly, webgpu: true });

// 1) Geometry descriptors preserve attributes, bounds, morph targets, and buffer access guards.
{
    const positions = new Float32Array([-1, -2, -3, 2, 0, 1, 0, 4, -1]);
    const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const uvs = new Float32Array([0, 0, 1, 0, 0, 1]);
    const uvs1 = new Float32Array([1, 1, 0, 1, 1, 0]);
    const tangents = new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1]);
    const colors = new Float32Array([1, 0, 0, 0.5, 0, 1, 0, 0.75, 0, 0, 1, 1]);
    const joints = new Uint16Array([0, 1, 0, 0, 1, 2, 0, 0, 2, 3, 0, 0]);
    const weights = new Float32Array([0.75, 0.25, 0, 0, 0.5, 0.5, 0, 0, 0.2, 0.8, 0, 0]);
    const joints1 = new Uint16Array([4, 5, 0, 0, 5, 6, 0, 0, 6, 7, 0, 0]);
    const weights1 = new Float32Array([0.1, 0.1, 0, 0, 0.1, 0.1, 0, 0, 0.1, 0.1, 0, 0]);
    const indices = new Uint32Array([0, 1, 2]);
    const morphPositions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const geometry = new Geometry({
        positions, normals, tangents, colors, uvs, uvs1, joints, weights, joints1, weights1, indices,
        morphTargets: [{ positions: morphPositions }],
        authoredNormals: true
    });

    assert.equal(geometry.vertexCount, 3);
    assert.equal(geometry.indexCount, 3);
    assert.equal(geometry.authoredNormals, true);
    assert.equal(geometry.tangents, tangents);
    assert.equal(geometry.colors, colors);
    assert.equal(geometry.morphTargets.length, 1);
    assert.equal(geometry.morphTargets[0].positions, morphPositions);
    arraysApproxEqual(Array.from(geometry.boundsMin), [-1, -2, -3]);
    arraysApproxEqual(Array.from(geometry.boundsMax), [2, 4, 1]);
    assert.ok(geometry.boundsRadius > 0);
    assert.equal(geometry.isIndexed, false);
    assert.equal(geometry.isSkinned, false);
    assert.equal(geometry.isSkinned8, false);
    assert.throws(() => geometry.positionBuffer, /not uploaded/);
    assert.throws(() => geometry.tangentBuffer, /not uploaded/);
    assert.throws(() => geometry.colorBuffer, /not uploaded/);
    geometry.destroy();
    assert.throws(() => geometry.positionBuffer, /already been released/);
}

// 2) Geometry validation degrades malformed optional attributes without breaking base geometry.
{
    const { result: geometry, messages: warnings } = safelySilence("warn", () => new Geometry({
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 1, 0]),
        tangents: new Float32Array([1, 0, 0, 1]),
        uvs: new Float32Array([0, 0]),
        joints: new Uint16Array([0, 0, 0, 0]),
        joints1: new Uint16Array(12),
        weights1: new Float32Array(12)
    }));

    assert.equal(geometry.vertexCount, 3);
    assert.equal(geometry.authoredNormals, false);
    assert.equal(geometry.normals.length, 9);
    assert.equal(geometry.tangents.length, 12);
    arraysApproxEqual(Array.from(geometry.tangents.slice(0, 4)), [0, 0, 0, 1]);
    assert.equal(geometry.uvs.length, 6);
    assert.equal(geometry.joints, null);
    assert.equal(geometry.weights, null);
    assert.equal(geometry.joints1, null);
    assert.equal(geometry.weights1, null);
    assert.ok(warnings.some((message) => message.includes("normals length mismatch")));
    assert.ok(warnings.some((message) => message.includes("tangents length mismatch")));
    assert.ok(warnings.some((message) => message.includes("uvs length mismatch")));
    assert.ok(warnings.some((message) => message.includes("JOINTS_0/WEIGHTS_0")));
    geometry.destroy();
}

// 3) Geometry factories produce indexed primitives with stable attribute and bounds contracts.
{
    const plane = Geometry.plane(2, 4, 2, 3);
    assert.equal(plane.vertexCount, 12);
    assert.equal(plane.indexCount, 36);
    arraysApproxEqual(Array.from(plane.boundsMin), [-1, 0, -2]);
    arraysApproxEqual(Array.from(plane.boundsMax), [1, 0, 2]);
    assert.ok(plane.normals.every((v, i) => (i % 3 === 1 ? Math.abs(v - 1) < 1e-6 : Math.abs(v) < 1e-6)));

    const rectangle = Geometry.rectangle(2, 1, "xy", true);
    assert.equal(rectangle.vertexCount, 8);
    assert.equal(rectangle.indexCount, 12);
    assert.ok(rectangle.normals.some((v) => v < 0));

    const box = Geometry.box(2, 4, 6);
    arraysApproxEqual(Array.from(box.boundsMin), [-1, -2, -3]);
    arraysApproxEqual(Array.from(box.boundsMax), [1, 2, 3]);
    assert.equal(box.indexCount, 36);

    const curve = Geometry.cartesianCurve({ f: (x) => x, xMin: 0, xMax: 1, segments: 4, radius: 0.05, radialSegments: 6 });
    assert.ok(curve.vertexCount > 0);
    assert.ok(curve.indexCount > 0);

    plane.destroy();
    rectangle.destroy();
    box.destroy();
    curve.destroy();
}

// 4) External WebAssembly memory views: constructor counts, mixed source kinds, explicit refresh, bounds, validation, and grow-only GPU capacity.
{
    const makeView = (length, dtype = "f32", name = "geometry-wasm-view", capacity = Math.max(length, 32)) => {
        const bytes = dtype === "u16" ? 2 : 4;
        const memory = new WebAssembly.Memory({ initial: Math.max(1, Math.ceil((capacity * bytes) / 65536)) });
        const moduleRef = webassemblyInterop.fromMemory(memory, { name });
        const lengthGlobal = new WebAssembly.Global({ value: "i32", mutable: true }, length);
        const Ctor = dtype === "u16" ? Uint16Array : dtype === "u32" ? Uint32Array : Float32Array;
        const data = new Ctor(memory.buffer, 0, capacity);
        const view = moduleRef.view({ ptr: 0, length: { global: lengthGlobal }, dtype, name });
        assert.ok(view instanceof WasmMemoryView, "Expected fromMemory().view() to return a WasmMemoryView");
        return { memory, moduleRef, lengthGlobal, data, view };
    };
    const setPositions = (target, count, base = 0) => { for (let i = 0; i < count; i++) target.set([base + i, base + i + 0.25, base + i + 0.5], i * 3); };

    const positions = makeView(9, "f32", "geometry:wasm:positions", 18);
    const indices = makeView(3, "u32", "geometry:wasm:indices", 6);
    setPositions(positions.data, 3, 0);
    indices.data.set([0, 1, 2]);
    const geometry = new Geometry({ wasmPositions: positions.view, wasmIndices: indices.view });
    assert.equal(geometry.vertexCount, 3, "Geometry should derive vertexCount from wasmPositions");
    assert.equal(geometry.indexCount, 3, "Geometry should derive indexCount from wasmIndices");
    assert.equal(geometry.positions.length, 0, "Default wasmPositions path should not retain CPU positions");
    arraysApproxEqual(Array.from(geometry.boundsMin), [0, 0.25, 0.5]);
    geometry.upload(device);
    assert.equal(geometry.isIndexed, true, "wasmIndices should create an index buffer after upload");
    const firstPositionBuffer = geometry.positionBuffer;
    const firstIndexBuffer = geometry.indexBuffer;
    assert.ok(firstPositionBuffer.size >= 4 * 3 * 4, "wasmVertexCapacity should be measured in vertices");
    assert.ok(firstIndexBuffer.size >= 3 * 4, "wasmIndexCapacity should be measured in indices");
    positions.lengthGlobal.value = 12;
    setPositions(positions.data, 4, 10);
    geometry.refreshWasmVertices({ vertexCount: 4 });
    geometry.upload(device);
    assert.strictEqual(geometry.positionBuffer, firstPositionBuffer, "Geometry should reuse wasm vertex capacity when the active count fits");
    positions.lengthGlobal.value = 15;
    setPositions(positions.data, 5, 20);
    geometry.refreshWasmVertices({ vertexCount: 5 });
    geometry.upload(device);
    assert.notStrictEqual(geometry.positionBuffer, firstPositionBuffer, "Geometry should grow wasm vertex capacity when active count exceeds capacity");
    geometry.destroy();

    const mixedIndices = makeView(6, "u32", "geometry:wasm:mixed:indices", 6);
    mixedIndices.data.set([0, 1, 2, 0, 2, 1]);
    const mixed = new Geometry({
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        wasmIndices: mixedIndices.view
    });
    assert.equal(mixed.vertexCount, 3, "CPU positions should mix with wasmIndices");
    assert.equal(mixed.indexCount, 6, "wasmIndices should derive indexCount in a mixed-source geometry");
    mixed.upload(device);
    assert.equal(mixed.isIndexed, true, "Mixed CPU+wasm geometry should upload an index buffer");
    mixed.destroy();

    const fallbackPositions = makeView(9, "f32", "geometry:wasm:fallback:positions", 9);
    const fallbackNormals = makeView(9, "f32", "geometry:wasm:fallback:normals", 9);
    const fallbackTangents = makeView(12, "f32", "geometry:wasm:fallback:tangents", 12);
    const fallbackColors = makeView(12, "f32", "geometry:wasm:fallback:colors", 12);
    const fallbackUvs = makeView(6, "f32", "geometry:wasm:fallback:uvs", 6);
    setPositions(fallbackPositions.data, 3, 0);
    fallbackNormals.data.fill(0.5);
    fallbackTangents.data.fill(0.25);
    fallbackColors.data.fill(0.125);
    fallbackUvs.data.fill(0.75);
    const { result: fallback, messages: tangentWarnings } = safelySilence(
        "warn",
        () => new Geometry({
            wasmPositions: fallbackPositions.view,
            wasmNormals: fallbackNormals.view,
            wasmTangents: fallbackTangents.view,
            wasmColors: fallbackColors.view,
            wasmUvs: fallbackUvs.view
        })
    );
    assert.deepStrictEqual(tangentWarnings, ["[Geometry] tangents length mismatch (got 0, expected 12). Using fallback tangents."], "Constructing with wasmTangents should report its expected CPU fallback warning");
    fallback.upload(device);
    fallback.setWasmNormals(null);
    fallback.setWasmTangents(null);
    fallback.setWasmUvs(null);
    assert.equal(fallback.normals.length, 9, "Clearing wasmNormals should restore fallback normals for the active vertex count");
    assert.equal(fallback.normals[1], 1, "Fallback normals should use the constructor's +Y default");
    assert.equal(fallback.tangents.length, 12, "Clearing wasmTangents should restore derivative fallback tangents");
    assert.equal(fallback.uvs.length, 6, "Clearing wasmUvs should restore zero UV fallback data");
    fallback.upload(device);
    assert.ok(fallback.normalBuffer.size >= 9 * 4, "Fallback normals should upload after clearing wasmNormals");
    assert.ok(fallback.tangentBuffer.size >= 12 * 4, "Fallback tangents should upload after clearing wasmTangents");
    assert.ok(fallback.colorBuffer.size >= 12 * 4, "Wasm colors should upload as a four-component vertex stream");
    assert.ok(fallback.uvBuffer.size >= 6 * 4, "Fallback UVs should upload after clearing wasmUvs");
    fallback.setWasmColors(null);
    assert.equal(fallback.colors.length, 12, "Clearing wasmColors should restore the white RGBA fallback");
    assert.ok(fallback.colors.every((value) => value === 1), "Missing colors should default to white RGBA values");
    fallback.upload(device);
    const fallbackNormalBuffer = fallback.normalBuffer;
    const tooShortFallbackNormals = makeView(6, "f32", "geometry:wasm:fallback:short:normals", 6);
    assert.throws(() => fallback.setWasmNormals(tooShortFallbackNormals.view, { vertexCount: 3 }), /wasmNormals length must be at least vertexCount\*3/i, "Rejected wasmNormals should validate before clearing fallback state");
    assert.strictEqual(fallback.normalBuffer, fallbackNormalBuffer, "Rejected wasmNormals should not destroy the existing fallback normal buffer");
    fallback.destroy();

    const skinPositions = makeView(9, "f32", "geometry:wasm:skin:positions", 9);
    const skinJoints = makeView(12, "u16", "geometry:wasm:skin:joints", 12);
    const skinWeights = makeView(12, "f32", "geometry:wasm:skin:weights", 12);
    setPositions(skinPositions.data, 3, 0);
    skinJoints.data.set([0, 1, 0, 0, 1, 2, 0, 0, 2, 3, 0, 0]);
    skinWeights.data.set([0.75, 0.25, 0, 0, 0.5, 0.5, 0, 0, 0.25, 0.75, 0, 0]);
    const skin4 = new Geometry({ wasmPositions: skinPositions.view, wasmJoints: skinJoints.view, wasmWeights: skinWeights.view });
    assert.equal(skin4.hasSkinAttributes, true, "wasmJoints+wasmWeights should enable 4-influence skin detection");
    assert.equal(skin4.hasSkin8Attributes, false, "4-influence wasm skinning should not enable 8-influence skin detection");
    skin4.upload(device);
    assert.ok(skin4.jointsBuffer && skin4.weightsBuffer, "UnlitMaterial-compatible separate wasm skin buffers should upload");
    assert.ok(skin4.skinInfluenceBuffer, "StandardMaterial-compatible packed wasm skin buffer should upload");
    skin4.destroy();

    const skinJoints1 = makeView(12, "u16", "geometry:wasm:skin:joints1", 12);
    const skinWeights1 = makeView(12, "f32", "geometry:wasm:skin:weights1", 12);
    skinJoints1.data.set([4, 5, 0, 0, 5, 6, 0, 0, 6, 7, 0, 0]);
    skinWeights1.data.set([0.2, 0.1, 0, 0, 0.15, 0.1, 0, 0, 0.1, 0.05, 0, 0]);
    const skin8 = new Geometry({ wasmPositions: skinPositions.view, wasmJoints: skinJoints.view, wasmWeights: skinWeights.view, wasmJoints1: skinJoints1.view, wasmWeights1: skinWeights1.view });
    assert.equal(skin8.hasSkinAttributes, true, "Base wasm skin pair should enable skin detection");
    assert.equal(skin8.hasSkin8Attributes, true, "Second wasm skin pair should enable 8-influence skin detection");
    skin8.upload(device);
    assert.ok(skin8.joints1Buffer && skin8.weights1Buffer, "8-influence separate wasm skin buffers should upload");
    assert.ok(skin8.skinInfluenceBuffer, "8-influence packed wasm skin buffer should upload");
    skin8.destroy();

    const keepPositions = makeView(12, "f32", "geometry:wasm:keep:positions", 18);
    setPositions(keepPositions.data, 4, -2);
    const keep = new Geometry({ wasmPositions: keepPositions.view, vertexCount: 2, wasmVertexCapacity: 4, keepCPUData: true });
    assert.equal(keep.vertexCount, 2, "Explicit vertexCount should override extra wasmPositions capacity");
    assert.equal(keep.positions.length, 6, "keepCPUData should snapshot only the active wasmPositions range");
    keep.upload(device);
    assert.ok(keep.positionBuffer.size >= 4 * 3 * 4, "wasmVertexCapacity should reserve logical vertex records");
    keep.destroy();

    const boundsPositions = makeView(9, "f32", "geometry:wasm:bounds", 9);
    setPositions(boundsPositions.data, 3, 0);
    const dynamicBounds = new Geometry({ wasmPositions: boundsPositions.view });
    boundsPositions.data.set([100, 101, 102, 103, 104, 105, 106, 107, 108]);
    dynamicBounds.refreshWasmVertices({ vertexCount: 3 });
    arraysApproxEqual(Array.from(dynamicBounds.boundsMax), [2, 2.25, 2.5], 1e-6, "Default refresh should preserve existing bounds");
    dynamicBounds.refreshWasmVertices({ vertexCount: 3, recomputeBounds: true });
    arraysApproxEqual(Array.from(dynamicBounds.boundsMax), [106, 107, 108], 1e-6, "recomputeBounds should scan active wasmPositions");
    dynamicBounds.destroy();

    const explicitBounds = new Geometry({
        wasmPositions: boundsPositions.view,
        bounds: { boxMin: [-1, -1, -1], boxMax: [1, 1, 1], sphereCenter: [0, 0, 0], sphereRadius: 2 }
    });
    explicitBounds.refreshWasmVertices({ vertexCount: 3, recomputeBounds: true });
    arraysApproxEqual(Array.from(explicitBounds.boundsMin), [-1, -1, -1], 1e-6, "Explicit bounds should not be overwritten by wasm refresh");
    explicitBounds.destroy();

    const shrink = makeView(9, "f32", "geometry:wasm:shrink", 9);
    setPositions(shrink.data, 3, 0);
    const shrinkGeometry = new Geometry({ wasmPositions: shrink.view, vertexCount: 3 });
    shrink.lengthGlobal.value = 6;
    assert.throws(() => shrinkGeometry.upload(device), /wasmPositions length must be at least vertexCount\*3/i, "upload() should validate refreshed wasmPositions length before reading");
    shrinkGeometry.destroy();

    const invalidPositions = makeView(10, "f32", "geometry:wasm:bad:length", 10);
    const shortNormals = makeView(6, "f32", "geometry:wasm:bad:normals", 6);
    const wrongDType = makeView(9, "u32", "geometry:wasm:bad:dtype", 9);
    for (const { message, error, create } of [
        { message: "Non-WasmMemoryView wasmPositions should throw", error: /wasmPositions must be a WasmMemoryView/i, create: () => new Geometry({ wasmPositions: positions.data }) },
        { message: "Non-f32 wasmPositions should throw", error: /wasmPositions dtype must be 'f32'/i, create: () => new Geometry({ wasmPositions: wrongDType.view }) },
        { message: "Invalid derived wasmPositions vertexCount should throw", error: /wasmPositions length must be a multiple of 3/i, create: () => new Geometry({ wasmPositions: invalidPositions.view }) },
        { message: "Short wasmNormals should throw", error: /wasmNormals length must be at least vertexCount\*3/i, create: () => new Geometry({ wasmPositions: positions.view, wasmNormals: shortNormals.view, vertexCount: 3 }) }
    ]) assert.throws(create, error, message);
}

// 5) Geometry bounds generation releases every scoped WebAssembly scratch allocation.
{
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const indices = new Uint32Array([0, 1, 2]);
    const originalFreeF32 = wasm.freeF32;
    const originalFreeU32 = wasm.freeU32;
    const freedF32 = [];
    const freedU32 = [];
    wasm.freeF32 = (ptr, len) => { freedF32.push([ptr, len]); originalFreeF32(ptr, len); };
    wasm.freeU32 = (ptr, len) => { freedU32.push([ptr, len]); originalFreeU32(ptr, len); };
    try {
        for (let i = 0; i < 16; i++) {
            const geometry = new Geometry({ positions, indices });
            geometry.destroy();
        }
    } finally {
        wasm.freeF32 = originalFreeF32;
        wasm.freeU32 = originalFreeU32;
    }
    assert.equal(freedF32.length, 16 * 5, "Each geometry must release its five bounds scratch allocations");
    assert.equal(freedU32.length, 0, "Geometry construction must not allocate persistent u32 scratch");
}

// 6) Cleanup waits for shared GPU work before destroying the browser device.
{
    await destroyTestDevice(device);
}
