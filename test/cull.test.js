/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, setupTest } from "./utils/helpers.js";
import { initWebAssembly, wasm, frameArena, cullf, frustumf } from "../dist/WasmGPU.js";

const { arraysApproxEqual } = createApproxHelpers();

await setupTest({ initWebAssembly });

// 1) cullf.writePlanesFromViewProjection which extracts frustum planes from a view-projection matrix.
{
    frameArena.reset();

    const vp = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];

    const frustumPtr = frameArena.allocF32(24);
    frustumf.writePlanesFromViewProjection(frustumPtr, vp);
    const planes = wasm.f32view(frustumPtr, 24);
    const frustumPtrDirect = frameArena.allocF32(24);
    const vpPtr = frameArena.allocF32(16);
    wasm.f32view(vpPtr, 16).set(vp);
    cullf.writePlanesFromViewProjection(frustumPtrDirect, vpPtr);
    const planesDirect = wasm.f32view(frustumPtrDirect, 24);

    // Expected planes (nx, ny, nz, d), inward facing, normalized.
    // left:   x >= -1  ->  ( 1, 0, 0, 1)
    // right:  x <=  1  ->  (-1, 0, 0, 1)
    // bottom: y >= -1  ->  ( 0, 1, 0, 1)
    // top:    y <=  1  ->  ( 0,-1, 0, 1)
    // near:   z >=  0  ->  ( 0, 0, 1, 0)
    // far:    z <=  1  ->  ( 0, 0,-1, 1)
    const expectedPlanes = new Float32Array([
        1, 0, 0, 1,
        -1, 0, 0, 1,
        0, 1, 0, 1,
        0, -1, 0, 1,
        0, 0, 1, 0,
        0, 0, -1, 1,
    ]);
    arraysApproxEqual(Array.from(planes), Array.from(expectedPlanes), 1e-6);
    arraysApproxEqual(Array.from(planesDirect), Array.from(expectedPlanes), 1e-6);

    const count = 6;
    const centersPtr = frameArena.allocF32(count * 3);
    const radiiPtr = frameArena.allocF32(count);
    const centers = wasm.f32view(centersPtr, count * 3);
    const radii = wasm.f32view(radiiPtr, count);

    // 0: inside
    centers.set([0, 0, 0.5], 0);
    radii[0] = 0.1;

    // 1: outside right
    centers.set([2, 0, 0.5], 3);
    radii[1] = 0.1;

    // 2: outside near (z < 0)
    centers.set([0, 0, -0.5], 6);
    radii[2] = 0.1;

    // 3: outside far (z > 1)
    centers.set([0, 0, 1.5], 9);
    radii[3] = 0.1;

    // 4: intersects left plane (still visible)
    centers.set([-1.05, 0, 0.5], 12);
    radii[4] = 0.1;

    // 5: intersects top plane (still visible)
    centers.set([0, 0.95, 0.5], 15);
    radii[5] = 0.1;

    const outPtr = frameArena.alloc(count * 4, 4);
    const visibleCount = cullf.spheresFrustum(outPtr, centersPtr, radiiPtr, count, frustumPtr);
    const out = wasm.u32view(outPtr, visibleCount);

    assert.strictEqual(visibleCount, 3, "Expected 3 visible spheres");
    assert.deepStrictEqual(Array.from(out), [0, 4, 5], "Visible indices mismatch");
}

// 2) cullf.prepareWorldSpheresFromPtrs which transforms local spheres by world matrices.
{
    frameArena.reset();

    const count = 2;
    const worldPtrsPtr = frameArena.alloc(count * 4, 4);
    const localCentersPtr = frameArena.allocF32(count * 3);
    const localRadiiPtr = frameArena.allocF32(count);
    const outCentersPtr = frameArena.allocF32(count * 3);
    const outRadiiPtr = frameArena.allocF32(count);

    const worldPtrs = wasm.u32view(worldPtrsPtr, count);
    const localCenters = wasm.f32view(localCentersPtr, count * 3);
    const localRadii = wasm.f32view(localRadiiPtr, count);

    const m0Ptr = frameArena.allocF32(16);
    const m1Ptr = frameArena.allocF32(16);
    wasm.f32view(m0Ptr, 16).set([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    wasm.f32view(m1Ptr, 16).set([
        2, 0, 0, 0,
        0, 2, 0, 0,
        0, 0, 2, 0,
        10, 0, 0, 1
    ]);

    worldPtrs[0] = m0Ptr >>> 0;
    worldPtrs[1] = m1Ptr >>> 0;

    localCenters.set([0, 0, 0, 1, 2, 3]);
    localRadii.set([1, 1]);

    cullf.prepareWorldSpheresFromPtrs(outCentersPtr, outRadiiPtr, worldPtrsPtr, localCentersPtr, localRadiiPtr, count);

    const outCenters = wasm.f32view(outCentersPtr, count * 3);
    const outRadii = wasm.f32view(outRadiiPtr, count);

    arraysApproxEqual(Array.from(outCenters), [0, 0, 0, 12, 4, 6], 1e-6);
    arraysApproxEqual(Array.from(outRadii), [1, 2], 1e-6);
}

// 3) cullf.spheresOcclusion uses WebGPU depth convention and only culls when nearestDepth > tileMaxDepth + bias.
{
    frameArena.reset();

    const viewProjPtr = frameArena.allocF32(16);
    wasm.f32view(viewProjPtr, 16).set([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);

    const count = 5;
    const centersPtr = frameArena.allocF32(count * 3);
    const radiiPtr = frameArena.allocF32(count);
    const centers = wasm.f32view(centersPtr, count * 3);
    const radii = wasm.f32view(radiiPtr, count);

    centers.set([0, 0, 0.2], 0);
    radii[0] = 0.05;

    centers.set([0, 0, 0.6], 3);
    radii[1] = 0.05;

    centers.set([0, 0, 0.3501], 6);
    radii[2] = 0.05;

    centers.set([0, 0, 0.02], 9);
    radii[3] = 0.05;

    centers.set([0, 0, 0.8], 12);
    radii[4] = -1;

    const mipOffsetsPtr = frameArena.alloc(4, 4);
    const mipWidthsPtr = frameArena.alloc(4, 4);
    const mipHeightsPtr = frameArena.alloc(4, 4);
    wasm.u32view(mipOffsetsPtr, 1).set([0]);
    wasm.u32view(mipWidthsPtr, 1).set([1]);
    wasm.u32view(mipHeightsPtr, 1).set([1]);

    const depthPtr = frameArena.allocF32(1);
    wasm.f32view(depthPtr, 1)[0] = 0.3;

    const outPtr = frameArena.alloc(count * 4, 4);
    const statsPtr = frameArena.alloc(12, 4);
    const visibleCount = cullf.spheresOcclusion(outPtr, statsPtr, centersPtr, radiiPtr, count, viewProjPtr, 128, 128, mipOffsetsPtr, mipWidthsPtr, mipHeightsPtr, 1, depthPtr, 1, 1e-5, 0.95, 2e-4);

    const visible = Array.from(wasm.u32view(outPtr, visibleCount));
    const stats = Array.from(wasm.u32view(statsPtr, 3));
    assert.strictEqual(visibleCount, 4, "Expected 4 visible spheres after conservative occlusion culling");
    assert.deepStrictEqual(visible, [0, 2, 3, 4], "Visible spheres must keep stable input order");
    assert.deepStrictEqual(stats, [5, 4, 1], "Occlusion stats mismatch");

    // Clear depth 1.0 never occludes with WebGPU-style depth where smaller is closer.
    wasm.f32view(depthPtr, 1)[0] = 1.0;
    const clearVisibleCount = cullf.spheresOcclusion(outPtr, statsPtr, centersPtr, radiiPtr, count, viewProjPtr, 128, 128, mipOffsetsPtr, mipWidthsPtr, mipHeightsPtr, 1, depthPtr, 1, 1e-5, 0.95, 2e-4);
    const clearStats = Array.from(wasm.u32view(statsPtr, 3));
    assert.strictEqual(clearVisibleCount, 5, "Clear depth should not occlude any sphere");
    assert.deepStrictEqual(clearStats, [5, 5, 0], "Clear-depth stats mismatch");

    assert.strictEqual(cullf.spheresOcclusion(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), 0);
}
