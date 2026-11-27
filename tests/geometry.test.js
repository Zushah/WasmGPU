/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, destroyTestDevice, safelySilence, setupTest } from "./utils/helpers.js";
import { initWebAssembly, Colormap, Geometry, wasm, webassemblyInterop, WasmMemoryView } from "../release/WasmGPU.js";

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

    const valuedPositions = makeView(9, "f32", "geometry:wasm:values", 18);
    setPositions(valuedPositions.data, 3, 0);
    const valued = new Geometry({ wasmPositions: valuedPositions.view, values: new Float32Array([1, 2, 3]) });
    assert.strictEqual(valued.valueComponents, 1, "CPU values should align with the WebAssembly vertex count");
    valued.refreshWasmVertices({ vertexCount: 3 });
    assert.deepStrictEqual(Array.from(valued.values), [1, 2, 3], "Refreshing without a count change must keep values");
    valuedPositions.lengthGlobal.value = 12;
    setPositions(valuedPositions.data, 4, 0);
    valued.refreshWasmVertices({ vertexCount: 4 });
    assert.strictEqual(valued.values, null, "A WebAssembly vertex-count change must drop misaligned values");
    assert.strictEqual(valued.valueComponents, 0);
    valued.destroy();
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

// 6) Plotting factories build curve profiles, flat end caps, flat height fields, per-vertex values and colors, and complex surfaces.
{
    const dot = (a, b) => (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
    const vec = (array, i, n = 3) => Array.from(array.slice(i * n, i * n + n));
    const line = { f: (x) => 0.5 * x, xMin: -1, xMax: 1, segments: 4, radius: 0.1, radialSegments: 6 };
    const P = 5;
    const R = 6;
    const counts = (geometry) => [geometry.vertexCount, geometry.indexCount];
    assert.deepStrictEqual(counts(Geometry.cartesianCurve(line)), [P * (R + 1) + 2 * (1 + R), 6 * R * (P - 1) + 2 * 3 * R], "round tube with flat end caps");
    assert.deepStrictEqual(counts(Geometry.cartesianCurve({ ...line, endcaps: false })), [P * (R + 1), 6 * R * (P - 1)], "endcaps: false keeps the old tube topology");
    assert.deepStrictEqual(counts(Geometry.cartesianCurve({ ...line, profile: "2d", doubleSided: false })), [2 * P, 6 * (P - 1)], "single-sided ribbon");
    assert.deepStrictEqual(counts(Geometry.cartesianCurve({ ...line, profile: "2d" })), [4 * P, 12 * (P - 1)], "double-sided ribbon");
    assert.deepStrictEqual(counts(Geometry.cartesianCurve({ ...line, profileSides: 3 })), [2 * 3 * P + 2 * (1 + 3), 6 * 3 * (P - 1) + 2 * 3 * 3], "capped triangular prism");
    assert.deepStrictEqual(counts(Geometry.cartesianCurve({ ...line, profileSides: 4, endcaps: false })), [2 * 4 * P, 6 * 4 * (P - 1)], "uncapped square prism");

    const closed = Geometry.parametricCurve({ f: (t) => [Math.cos(t), Math.sin(t)], tMin: 0, tMax: 2 * Math.PI, segments: 16, closed: true, radius: 0.05, radialSegments: R });
    assert.deepStrictEqual(counts(closed), [16 * (R + 1), 6 * R * 16], "closed curves get no caps");
    const broken = Geometry.cartesianCurve({ ...line, f: (x) => (Math.abs(x) < 0.3 ? NaN : x), segments: 10 });
    assert.deepStrictEqual(counts(broken), [2 * (4 * (R + 1) + 2 * (1 + R)), 2 * (6 * R * 3 + 2 * 3 * R)], "breakOnInvalid caps every piece");

    const tangent = [2 / Math.sqrt(5), 1 / Math.sqrt(5), 0];
    for (const sides of [3, 4, 6]) {
        const prism = Geometry.cartesianCurve({ ...line, profileSides: sides, endcaps: false });
        for (let i = 0; i < prism.vertexCount; i++) {
            const n = vec(prism.normals, i);
            numberApproxEqual(Math.hypot(...n), 1, 1e-6, `prism(${sides}) normal ${i} must be unit length`);
            numberApproxEqual(dot(n, tangent), 0, 1e-6, `prism(${sides}) normal ${i} must be perpendicular to the tangent`);
        }
    }
    const planeNormals = { xy: [0, 0, 1], xz: [0, 1, 0], yz: [1, 0, 0] };
    for (const [plane, normal] of Object.entries(planeNormals)) {
        const ribbon = Geometry.cartesianCurve({ ...line, plane, profile: "2d" });
        for (let i = 0; i < ribbon.vertexCount; i++) arraysApproxEqual(vec(ribbon.normals, i), i < 2 * P ? normal : normal.map((v) => -v), 1e-6, `${plane} ribbon normal ${i}`);
        const square = Geometry.cartesianCurve({ ...line, plane, profileSides: 4 });
        arraysApproxEqual(vec(square.normals, 0), normal, 1e-6, `${plane} prism face 0 must face the plane normal`);
    }
    const rotated = Geometry.cartesianCurve({ ...line, profile: "2d", doubleSided: false, profileRotation: Math.PI / 2 });
    numberApproxEqual(Math.abs(rotated.normals[2]), 0, 1e-6, "profileRotation turns the ribbon about the tangent");

    assert.throws(() => Geometry.cartesianCurve({ ...line, profile: "2d", profileSides: 3 }), /Geometry\.cartesianCurve: profile '2d'/);
    assert.throws(() => Geometry.parametricCurve({ f: (t) => [t, t], profile: "3d", profileSides: 2 }), /Geometry\.parametricCurve: profileSides 2/);
    assert.throws(() => Geometry.cartesianCurve({ ...line, profileSides: 0 }), /profileSides must be an integer >= 1/);
    assert.throws(() => Geometry.cartesianCurve({ ...line, profileSides: 2.5 }), /profileSides must be an integer >= 1/);
    assert.throws(() => Geometry.cartesianCurve({ ...line, profile: "4d" }), /profile must be '2d' or '3d'/);

    const flat = Geometry.cartesianSurface({ f: (x, z) => Math.sin(3 * x) + z, xSegments: 3, zSegments: 2, heightScale: 0, color: {} });
    for (let i = 0; i < flat.vertexCount; i++) {
        assert.strictEqual(Math.abs(flat.positions[i * 3 + 1]), 0, "heightScale: 0 must flatten the field");
        arraysApproxEqual(vec(flat.normals, i), [0, 1, 0], 1e-6, "flat xz fields must face +y");
    }
    numberApproxEqual(flat.values[0], Math.sin(-3) - 1, 1e-6, "color values must use the unscaled height");
    const flatXY = Geometry.cartesianSurface({ f: () => 0, xSegments: 1, zSegments: 1, plane: "xy" });
    arraysApproxEqual(vec(flatXY.normals, 0), [0, 0, 1], 1e-6, "flat xy fields must face +z");
    assert.throws(() => Geometry.cartesianSurface({ f: () => 0, heightScale: Infinity }), /heightScale must be a finite number/);

    const colored = Geometry.cartesianCurve({ ...line, color: { by: "y" } });
    assert.strictEqual(colored.valueComponents, 1);
    assert.strictEqual(colored.values.length, colored.vertexCount, "values align with vertices");
    assert.strictEqual(colored.colors.length, 4 * colored.vertexCount, "colors align with vertices");
    numberApproxEqual(colored.values[0], -0.5, 1e-6, "vertex 0 belongs to sample x = -1");
    numberApproxEqual(colored.values[colored.vertexCount - 1], 0.5, 1e-6, "the end cap belongs to the last sample");
    arraysApproxEqual(vec(colored.colors, 0, 4), Colormap.builtin("viridis").sampleCPU(0), 1e-6, "the default colormap and range map the minimum to t = 0");
    const byX = Geometry.cartesianCurve({ ...line, color: { by: "x", colormap: "magma", range: [-2, 2] } });
    numberApproxEqual(byX.values[0], -1, 1e-6);
    arraysApproxEqual(vec(byX.colors, 0, 4), Colormap.builtin("magma").sampleCPU(0.25), 1e-6, "color.range normalizes values");
    const partial = Geometry.cartesianCurve({ ...line, color: { by: (x, y) => (x > 0 ? NaN : x * y) } });
    assert.ok(Number.isNaN(partial.values[partial.vertexCount - 1]), "non-finite values stay NaN");
    arraysApproxEqual(vec(partial.colors, partial.vertexCount - 1, 4), [0, 0, 0, 0], 0, "non-finite values get transparent black");
    assert.strictEqual(Geometry.cartesianCurve(line).values, null, "factories without color write no values");
    assert.throws(() => Geometry.cartesianCurve({ ...line, color: { by: "z" } }), /color\.by must be a function or one of 'x', 'y'/);

    const sided = Geometry.cartesianSurface({ f: (x, z) => x + z, xSegments: 2, zSegments: 2, doubleSided: true, color: { by: "x" } });
    assert.strictEqual(sided.vertexCount, 18);
    assert.strictEqual(sided.values.length, 18, "double-sided duplication keeps values aligned");
    assert.strictEqual(sided.colors.length, 72, "double-sided duplication keeps colors aligned");
    for (let i = 0; i < 9; i++) {
        assert.strictEqual(sided.values[9 + i], sided.values[i]);
        arraysApproxEqual(vec(sided.colors, 9 + i, 4), vec(sided.colors, i, 4), 0);
    }
    const ribbonValues = Geometry.cartesianCurve({ ...line, profile: "2d", color: {} });
    assert.strictEqual(ribbonValues.values.length, ribbonValues.vertexCount, "double-sided ribbons keep values aligned");

    const planar = Geometry.parametricSurface({ f: (u, v) => [u, v], uSegments: 2, vSegments: 2, color: {} });
    assert.strictEqual(planar.vertexCount, 9);
    for (let i = 0; i < 9; i++) assert.strictEqual(planar.positions[i * 3 + 2], 0, "2-component parametric surfaces lie in the plot plane");
    assert.ok(planar.values.every((v) => v === 0), "2-component output colors by z = 0");

    const { result: dropped, messages } = safelySilence("warn", () => [
        new Geometry({ positions: new Float32Array(9), values: new Float32Array(2) }),
        new Geometry({ positions: new Float32Array(9), values: new Float32Array(15), valueComponents: 5 })
    ]);
    assert.ok(dropped.every((g) => g.values === null && g.valueComponents === 0), "invalid values are dropped");
    assert.strictEqual(messages.length, 2, "dropping values warns");
    const kept = new Geometry({ positions: new Float32Array(9), values: new Float32Array(6), valueComponents: 2 });
    assert.strictEqual(kept.valueComponents, 2);

    const reciprocal = (re, im) => { const d = (re * re) + (im * im); return [re / d, -im / d]; };
    const grid = { reSegments: 4, imSegments: 4 };
    const pole = Geometry.complexSurface({ f: reciprocal, ...grid });
    assert.strictEqual(pole.indexCount, 4 * 4 * 6, "height: 'none' keeps every vertex valid around a pole");
    assert.strictEqual(pole.valueComponents, 2);
    assert.strictEqual(pole.values.length, 2 * pole.vertexCount);
    const origin = 2 + 5 * 2;
    assert.ok(Number.isNaN(pole.values[origin * 2]) && Number.isNaN(pole.values[origin * 2 + 1]), "non-finite values stay NaN");
    arraysApproxEqual(vec(pole.colors, origin, 4), [1, 1, 1, 1], 0, "poles are white");
    assert.strictEqual(Geometry.complexSurface({ f: reciprocal, ...grid, height: "modulus" }).indexCount, (4 * 4 - 4) * 6, "invalid heights drop their quads");
    const identity = Geometry.complexSurface({ f: (re, im) => [re, im], ...grid, height: "modulus" });
    numberApproxEqual(identity.positions[(3 + 5 * 4) * 3 + 1], Math.sqrt(5), 1e-6, "height is |z| at re = 1, im = 2");
    arraysApproxEqual(vec(identity.colors, origin, 4), [0, 0, 0, 1], 0, "the origin of f = z is black");
    const clamped = Geometry.complexSurface({ f: (re, im) => [re, im], ...grid, height: "modulus", heightRange: [0, 1], heightScale: 2 });
    numberApproxEqual(Math.max(...vec(clamped.positions, 0, clamped.positions.length).filter((_, i) => i % 3 === 1)), 2, 1e-6, "heightRange clamps before heightScale");
    assert.throws(() => Geometry.complexSurface({ f: (re, im) => [re, im], color: {} }), /Geometry\.complexSurface: color is not supported/);
}

// 7) Cleanup waits for shared GPU work before destroying the browser device.
{
    await destroyTestDevice(device);
}
