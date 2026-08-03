/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, createBrowserCanvasScope, destroyTestDevice, makeSequence, setupTest } from "./utils/helpers.js";
import * as WasmGPU from "../dist/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers();
const browserCanvases = createBrowserCanvasScope();

const packSHRecord = (index, sh0, sh1, sh2, sh3) => [...Array.from(sh0.subarray(index * 3, index * 3 + 3)), ...Array.from(sh1.subarray(index * 9, index * 9 + 9)), ...Array.from(sh2.subarray(index * 15, index * 15 + 15)), ...Array.from(sh3.subarray(index * 21, index * 21 + 21))];

const { device } = await setupTest({ initWebAssembly: WasmGPU.initWebAssembly, webgpu: true });
const { WasmGPU: Engine, SelectionStore } = WasmGPU;
assert.ok(Engine, "Missing export: WasmGPU class");
assert.ok(typeof Engine.prototype.pick === "function", "Missing API: WasmGPU.pick(scene, camera, x, y, opts?)");
assert.ok(typeof Engine.prototype.pickRect === "function", "Missing API: WasmGPU.pickRect(scene, camera, x0, y0, x1, y1, opts?)");
assert.ok(typeof Engine.prototype.pickLasso === "function", "Missing API: WasmGPU.pickLasso(scene, camera, points, opts?)");
assert.ok(typeof Engine.createSelectionStore === "function", "Missing API: WasmGPU.createSelectionStore()");
assert.ok(SelectionStore, "Missing export: SelectionStore");

const pointScaleTransform = { componentCount: 4, componentIndex: 3, stride: 4, offset: 0 };
const glyphScaleTransform = { componentCount: 4, componentIndex: 0, stride: 4, offset: 0 };

const canvas = browserCanvases.createCanvas(512, 512);
const wgpu = await Engine.create(canvas, { antialias: false, frustumCulling: false, canvasFormat: "rgba8unorm" });
const scene = wgpu.createScene([0, 0, 0]);
const camera = wgpu.createCamera.perspective({ fov: 50, near: 0.1, far: 200 });
camera.transform.setPosition(0, 0, 12);
camera.lookAt(0, 0, 0);

const mesh = wgpu.createMesh(wgpu.geometry.box(2, 2, 2), wgpu.material.unlit({ color: [0.8, 0.9, 1.0] }));
mesh.transform.setPosition(-2, 0, 0);

const cloud = wgpu.createPointCloud({
    data: new Float32Array([0, 0, 0, 0.10, 1, 0, 0, 0.20, 0, 1, 0, 0.30, 1, 1, 0, 0.40]),
    keepCPUData: true,
    ndShape: [2, 2],
    basePointSize: 10,
    depthWrite: true,
    blendMode: "opaque",
    scaleTransform: pointScaleTransform
});
cloud.transform.setPosition(0, 0, 0);

const field = wgpu.createGlyphField({
    geometry: wgpu.geometry.box(0.25, 0.25, 0.25),
    instanceCount: 2,
    positions: new Float32Array([2, 0, 0, 0, 2, 1, 0, 0]),
    rotations: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
    scales: new Float32Array([1, 1, 1, 0, 1, 1, 1, 0]),
    attributes: new Float32Array([0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]),
    keepCPUData: true,
    ndShape: [1, 2],
    scaleTransform: glyphScaleTransform
});

const cloudNoCPU = wgpu.createPointCloud({
    data: new Float32Array([-1, -1, 0, 0.8, -2, -2, 0, 0.9]),
    keepCPUData: false,
    ndShape: [2, 1],
    scaleTransform: pointScaleTransform
});
cloudNoCPU.upload(wgpu.gpu.device, wgpu.gpu.queue);

const link = wgpu.createNodeLink({
    nodePositions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]),
    edges: new Uint16Array([0, 1, 2, 3]),
    nodeScalars: new Float32Array([0.1, 0.2, 0.3, 0.4]),
    nodeColors: new Float32Array([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 1, 0, 1]),
    edgeScalars: new Float32Array([0.6, 0.9]),
    edgeColors: new Float32Array([0.2, 0.2, 0.2, 1, 0.8, 0.8, 0.8, 1]),
    keepCPUData: true,
    ndShape: [2, 2]
});
link.upload(wgpu.gpu.device, wgpu.gpu.queue);

const splat = wgpu.createSplatField({
    positions: new Float32Array([3, 0, 0, 3, 1, 0]),
    rotations: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
    scales: new Float32Array([0.25, 0.3, 0.35, 0.4, 0.45, 0.5]),
    opacities: new Float32Array([0.65, 0.85]),
    colors: new Float32Array([0.7, 0.1, 0.2, 0.9, 0.2, 0.8, 0.3, 0.75]),
    keepCPUData: true,
    ndShape: [1, 2]
});

const splatNoCPU = wgpu.createSplatField({
    positions: new Float32Array([-3, 0, 0, -3, 1, 0]),
    scales: new Float32Array([0.2, 0.2, 0.2, 0.2, 0.2, 0.2]),
    keepCPUData: false,
    ndShape: [2]
});
splatNoCPU.upload(wgpu.gpu.device, wgpu.gpu.queue);

scene.add(mesh).add(cloud).add(field).add(cloudNoCPU).add(link).add(splat).add(splatNoCPU);

const renderer = wgpu.renderer;
assert.ok(renderer && typeof renderer.pick === "function", "Internal renderer.pick is required for WasmGPU.pick");
assert.ok(typeof renderer.pickRect === "function", "Internal renderer.pickRect is required for WasmGPU.pickRect");
assert.ok(typeof renderer.pickLasso === "function", "Internal renderer.pickLasso is required for WasmGPU.pickLasso");
const originalRendererPick = renderer.pick.bind(renderer);
const originalRendererPickRect = renderer.pickRect.bind(renderer);
const originalRendererPickLasso = renderer.pickLasso.bind(renderer);

const makePickHit = (kind, object, objectId, elementIndex, worldPosition) => ({ kind, object, objectId, elementIndex, worldPosition });

// 1) Public picking enriches mocked point, region, lasso, and object-kind hits with CPU metadata.
{
    try {
        renderer.pick = async () => makePickHit("pointcloud", cloud, 11, 3, [1, 1, 0]);
        const pointHit = await wgpu.pick(scene, camera, 128, 128);
        assert.ok(pointHit, "Expected pointcloud pick hit");
        assert.strictEqual(pointHit.kind, "pointcloud");
        assert.strictEqual(pointHit.object, cloud);
        assert.strictEqual(pointHit.objectId, 11);
        assert.strictEqual(pointHit.elementIndex, 3);
        assert.deepStrictEqual(pointHit.worldPosition, [1, 1, 0]);
        assert.deepStrictEqual(pointHit.ndIndex, [1, 1], "PointCloud nd index decode mismatch");
        assert.ok(pointHit.attributes, "PointCloud attributes should be present when CPU data exists");
        numberApproxEqual(pointHit.attributes.scalar, 0.40, 1e-6, "PointCloud scalar attribute mismatch");
        arraysApproxEqual(pointHit.attributes.packedPoint, [1, 1, 0, 0.40], 1e-6, "PointCloud packed tuple mismatch");

        const pointNoAttr = await wgpu.pick(scene, camera, 128, 128, { includeAttributes: false });
        assert.ok(pointNoAttr, "Expected pointcloud hit with includeAttributes=false");
        assert.strictEqual(pointNoAttr.attributes, null, "Attributes should be null when includeAttributes=false");

        renderer.pick = async () => makePickHit("pointcloud", cloudNoCPU, 12, 1, [-2, -2, 0]);
        const noCPUHit = await wgpu.pick(scene, camera, 128, 128);
        assert.ok(noCPUHit, "Expected cloudNoCPU pick hit");
        assert.deepStrictEqual(noCPUHit.ndIndex, [1, 0], "PointCloud nd index decode should still work without CPU attributes");
        assert.strictEqual(noCPUHit.attributes, null, "PointCloud attributes should be null when CPU data is unavailable");

        renderer.pick = async () => makePickHit("glyphfield", field, 21, 1, [2, 1, 0]);
        const glyphHit = await wgpu.pick(scene, camera, 128, 128);
        assert.ok(glyphHit, "Expected glyphfield pick hit");
        assert.strictEqual(glyphHit.kind, "glyphfield");
        assert.strictEqual(glyphHit.object, field);
        assert.strictEqual(glyphHit.elementIndex, 1);
        assert.deepStrictEqual(glyphHit.ndIndex, [0, 1], "GlyphField nd index decode mismatch");
        assert.ok(glyphHit.attributes, "GlyphField attributes should be present when CPU data exists");
        arraysApproxEqual(glyphHit.attributes.vector, [4.5, 5.5, 6.5, 7.5], 1e-6, "GlyphField vec4 attribute mismatch");

        renderer.pick = async () => makePickHit("splatfield", splat, 51, 1, [3, 1, 0]);
        const splatHit = await wgpu.pick(scene, camera, 128, 128);
        assert.ok(splatHit, "Expected splatfield pick hit");
        assert.strictEqual(splatHit.kind, "splatfield");
        assert.strictEqual(splatHit.object, splat);
        assert.strictEqual(splatHit.elementIndex, 1);
        assert.deepStrictEqual(splatHit.ndIndex, [0, 1], "SplatField nd index decode mismatch");
        assert.ok(splatHit.attributes, "SplatField attributes should be present when CPU data exists");
        arraysApproxEqual(splatHit.attributes.position, [3, 1, 0], 1e-6, "SplatField position attribute mismatch");
        arraysApproxEqual(splatHit.attributes.rotation, [0, 0, 0, 1], 1e-6, "SplatField rotation attribute mismatch");
        arraysApproxEqual(splatHit.attributes.scale, [0.4, 0.45, 0.5], 1e-6, "SplatField scale attribute mismatch");
        numberApproxEqual(splatHit.attributes.opacity, 0.85, 1e-6, "SplatField opacity attribute mismatch");
        arraysApproxEqual(splatHit.attributes.packedSplat, [3, 1, 0, 0.85], 1e-6, "SplatField packed tuple mismatch");
        arraysApproxEqual(splatHit.attributes.color, [0.2, 0.8, 0.3, 0.75], 1e-6, "SplatField color attribute mismatch");

        const splatNoAttr = await wgpu.pick(scene, camera, 128, 128, { includeAttributes: false });
        assert.ok(splatNoAttr, "Expected splatfield hit with includeAttributes=false");
        assert.strictEqual(splatNoAttr.attributes, null, "SplatField attributes should be null when includeAttributes=false");

        renderer.pick = async () => makePickHit("splatfield", splatNoCPU, 52, 1, [-3, 1, 0]);
        const splatNoCPUHit = await wgpu.pick(scene, camera, 128, 128);
        assert.ok(splatNoCPUHit, "Expected splatfield hit without CPU records");
        assert.deepStrictEqual(splatNoCPUHit.ndIndex, [1], "SplatField nd index decode should still work without CPU attributes");
        assert.strictEqual(splatNoCPUHit.attributes, null, "SplatField attributes should be null when CPU data is unavailable");

        renderer.pick = async () => makePickHit("nodelink", link, 41, 2, [0, 1, 0]);
        const nodeLinkNodeHit = await wgpu.pick(scene, camera, 128, 128, { includeAttributes: true });
        assert.ok(nodeLinkNodeHit, "Expected nodelink node pick hit");
        assert.strictEqual(nodeLinkNodeHit.kind, "nodelink");
        assert.strictEqual(nodeLinkNodeHit.object, link);
        assert.deepStrictEqual(nodeLinkNodeHit.ndIndex, [1, 0], "NodeLink node nd-index mismatch");
        assert.ok(nodeLinkNodeHit.attributes, "NodeLink node attributes should be present");
        assert.strictEqual(nodeLinkNodeHit.attributes.component, "node", "NodeLink node component mismatch");
        assert.strictEqual(nodeLinkNodeHit.attributes.componentIndex, 2, "NodeLink node componentIndex mismatch");
        numberApproxEqual(nodeLinkNodeHit.attributes.scalar, 0.30, 1e-6, "NodeLink node scalar mismatch");
        arraysApproxEqual(nodeLinkNodeHit.attributes.color, [0, 0, 1, 1], 1e-6, "NodeLink node color mismatch");
        assert.strictEqual(nodeLinkNodeHit.attributes.edgeEndpoints, undefined, "NodeLink node hit should not have edge endpoints");

        renderer.pick = async () => makePickHit("nodelink", link, 41, link.nodeCount + 1, [0.5, 1, 0]);
        const nodeLinkEdgeHit = await wgpu.pick(scene, camera, 128, 128, { includeAttributes: true });
        assert.ok(nodeLinkEdgeHit, "Expected nodelink edge pick hit");
        assert.strictEqual(nodeLinkEdgeHit.kind, "nodelink");
        assert.strictEqual(nodeLinkEdgeHit.object, link);
        assert.strictEqual(nodeLinkEdgeHit.ndIndex, null, "NodeLink edge ndIndex should be null");
        assert.ok(nodeLinkEdgeHit.attributes, "NodeLink edge attributes should be present");
        assert.strictEqual(nodeLinkEdgeHit.attributes.component, "edge", "NodeLink edge component mismatch");
        assert.strictEqual(nodeLinkEdgeHit.attributes.componentIndex, 1, "NodeLink edge componentIndex mismatch");
        numberApproxEqual(nodeLinkEdgeHit.attributes.scalar, 0.90, 1e-6, "NodeLink edge scalar mismatch");
        arraysApproxEqual(nodeLinkEdgeHit.attributes.color, [0.8, 0.8, 0.8, 1], 1e-6, "NodeLink edge color mismatch");
        assert.deepStrictEqual(nodeLinkEdgeHit.attributes.edgeEndpoints, [2, 3], "NodeLink edge endpoints mismatch");
        arraysApproxEqual(nodeLinkEdgeHit.attributes.edgePositions, [0, 1, 0, 1, 1, 0], 1e-6, "NodeLink edge positions mismatch");

        renderer.pick = async () => makePickHit("mesh", mesh, 31, 7, [-2, 0, 0]);
        const meshHit = await wgpu.pick(scene, camera, 128, 128);
        assert.ok(meshHit, "Expected mesh pick hit");
        assert.strictEqual(meshHit.kind, "mesh");
        assert.strictEqual(meshHit.object, mesh);
        assert.strictEqual(meshHit.elementIndex, 7, "Mesh elementIndex should reflect primitive index payload");
        assert.strictEqual(meshHit.ndIndex, null, "Mesh ndIndex should be null");
        assert.strictEqual(meshHit.attributes, null, "Mesh attributes should be null");

        renderer.pick = async () => {
            const hits = [
                { depth: 0.92, hit: makePickHit("mesh", mesh, 31, 1, [-2, 0, 0]) },
                { depth: 0.23, hit: makePickHit("pointcloud", cloud, 11, 2, [0, 1, 0]) }
            ];
            hits.sort((a, b) => a.depth - b.depth);
            return hits[0].hit;
        };
        const frontHit = await wgpu.pick(scene, camera, 128, 128);
        assert.ok(frontHit, "Expected occlusion pick hit");
        assert.strictEqual(frontHit.object, cloud, "Depth occlusion should resolve to front-most object");

        renderer.pick = async () => null;
        const miss = await wgpu.pick(scene, camera, 128, 128);
        assert.strictEqual(miss, null, "Miss picks should return null");

        let rectOpts = null;
        renderer.pickRect = async (_scene, _camera, _x0, _y0, _x1, _y1, opts) => {
            rectOpts = opts;
            return {
                mode: "rect",
                hits: [
                    makePickHit("pointcloud", cloud, 11, 2, [0, 1, 0]),
                    makePickHit("glyphfield", field, 21, 1, [2, 1, 0])
                ],
                truncated: false,
                bounds: { x: 12, y: 34, width: 56, height: 78 },
                sampledPixels: 128
            };
        };
        const rectResult = await wgpu.pickRect(scene, camera, 10, 20, 110, 140, { maxHits: 5 });
        assert.strictEqual(rectOpts.maxHits, 5, "pickRect should forward maxHits to renderer");
        assert.strictEqual(rectResult.mode, "rect", "pickRect should preserve mode");
        assert.strictEqual(rectResult.hits.length, 2, "pickRect should include all renderer hits");
        assert.strictEqual(rectResult.truncated, false, "pickRect truncation flag mismatch");
        assert.deepStrictEqual(rectResult.bounds, { x: 12, y: 34, width: 56, height: 78 }, "pickRect bounds mismatch");
        assert.strictEqual(rectResult.sampledPixels, 128, "pickRect sampledPixels mismatch");
        assert.deepStrictEqual(rectResult.hits[0].ndIndex, [1, 0], "pickRect pointcloud ndIndex mismatch");
        assert.ok(rectResult.hits[0].attributes, "pickRect pointcloud attributes should exist");
        numberApproxEqual(rectResult.hits[0].attributes.scalar, 0.30, 1e-6, "pickRect scalar mismatch");
        assert.deepStrictEqual(rectResult.hits[1].ndIndex, [0, 1], "pickRect glyph ndIndex mismatch");
        assert.ok(rectResult.hits[1].attributes, "pickRect glyph attributes should exist");

        const rectNoAttr = await wgpu.pickRect(scene, camera, 10, 20, 110, 140, { includeAttributes: false });
        assert.strictEqual(rectNoAttr.hits[0].attributes, null, "pickRect includeAttributes=false should null pointcloud attrs");
        assert.strictEqual(rectNoAttr.hits[1].attributes, null, "pickRect includeAttributes=false should null glyph attrs");

        let lassoPoints = null;
        let lassoOpts = null;
        renderer.pickLasso = async (_scene, _camera, points, opts) => {
            lassoPoints = points;
            lassoOpts = opts;
            return {
                mode: "lasso",
                hits: [makePickHit("pointcloud", cloudNoCPU, 12, 1, [-2, -2, 0])],
                truncated: true,
                bounds: { x: 1, y: 2, width: 40, height: 20 },
                sampledPixels: 9
            };
        };
        const lassoInput = [{ x: 1, y: 1 }, { x: 60, y: 1 }, { x: 60, y: 40 }, { x: 10, y: 20 }];
        const lassoResult = await wgpu.pickLasso(scene, camera, lassoInput, { includeAttributes: true, maxHits: 1 });
        assert.strictEqual(lassoPoints.length, lassoInput.length, "pickLasso should forward points to renderer");
        assert.strictEqual(lassoOpts.maxHits, 1, "pickLasso should forward maxHits to renderer");
        assert.strictEqual(lassoResult.mode, "lasso", "pickLasso should preserve mode");
        assert.strictEqual(lassoResult.truncated, true, "pickLasso truncation flag mismatch");
        assert.strictEqual(lassoResult.hits.length, 1, "pickLasso hit count mismatch");
        assert.deepStrictEqual(lassoResult.hits[0].ndIndex, [1, 0], "pickLasso ndIndex mismatch");
        assert.strictEqual(lassoResult.hits[0].attributes, null, "pickLasso should keep null attributes when CPU data is unavailable");

        renderer.pickRect = async () => ({
            mode: "rect",
            hits: [
                makePickHit("nodelink", link, 41, 1, [1, 0, 0]),
                makePickHit("nodelink", link, 41, link.nodeCount + 0, [0.5, 0, 0])
            ],
            truncated: false,
            bounds: { x: 10, y: 20, width: 100, height: 100 },
            sampledPixels: 64
        });
        const nodeLinkRect = await wgpu.pickRect(scene, camera, 10, 20, 110, 120, { includeAttributes: true, maxHits: 8 });
        assert.strictEqual(nodeLinkRect.mode, "rect", "NodeLink pickRect mode mismatch");
        assert.strictEqual(nodeLinkRect.hits.length, 2, "NodeLink pickRect hit count mismatch");
        assert.strictEqual(nodeLinkRect.hits[0].attributes.component, "node", "NodeLink pickRect first hit should decode as node");
        assert.strictEqual(nodeLinkRect.hits[1].attributes.component, "edge", "NodeLink pickRect second hit should decode as edge");
        assert.deepStrictEqual(nodeLinkRect.hits[0].ndIndex, [0, 1], "NodeLink pickRect node ndIndex mismatch");
        assert.strictEqual(nodeLinkRect.hits[1].ndIndex, null, "NodeLink pickRect edge ndIndex should be null");

        renderer.pickRect = async () => ({
            mode: "rect",
            hits: [],
            truncated: false,
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            sampledPixels: 0
        });
        const rectMiss = await wgpu.pickRect(scene, camera, 0, 0, 0, 0);
        assert.strictEqual(rectMiss.hits.length, 0, "pickRect miss should return empty hit list");
        assert.strictEqual(rectMiss.truncated, false, "pickRect miss should not be truncated");
    } finally {
        renderer.pick = originalRendererPick;
        renderer.pickRect = originalRendererPickRect;
        renderer.pickLasso = originalRendererPickLasso;
    }
}

// 2) Real GPU picking resolves direct-color and spherical-harmonic splat footprints before rendering.
{
    const pickScene = wgpu.createScene([0, 0, 0]);
    const pickCamera = wgpu.createCamera.perspective({ fov: 50, near: 0.1, far: 200 });
    pickCamera.transform.setPosition(0, 0, 8);
    pickCamera.lookAt(0, 0, 0);
    const pickSplat = wgpu.createSplatField({
        positions: new Float32Array([0, 0, 0, 0, 0, 1]),
        rotations: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
        scales: new Float32Array([0.35, 0.35, 0.35, 0.35, 0.35, 0.35]),
        opacities: new Float32Array([1, 1]),
        colors: new Float32Array([1, 0, 0, 1, 0, 1, 0, 1]),
        keepCPUData: true,
        ndShape: [2]
    });
    pickScene.add(pickSplat);

    const splatPick = await wgpu.pick(pickScene, pickCamera, canvas.clientWidth * 0.5, canvas.clientHeight * 0.5, { includeAttributes: true });
    assert.ok(splatPick, "Expected splatfield pick before render()");
    assert.strictEqual(splatPick.kind, "splatfield", "Expected actual renderer pick to return splatfield kind");
    assert.strictEqual(splatPick.object, pickSplat, "Expected actual renderer pick to return the splatfield object");
    assert.strictEqual(splatPick.elementIndex, 1, "Expected nearest splat footprint to win depth picking");
    assert.deepStrictEqual(splatPick.ndIndex, [1], "Actual splatfield pick ndIndex mismatch");
    assert.ok(splatPick.attributes, "Actual splatfield pick attributes should be present");
    arraysApproxEqual(splatPick.attributes.position, [0, 0, 1], 1e-6, "Actual splatfield pick position mismatch");
    arraysApproxEqual(splatPick.attributes.packedSplat, [0, 0, 1, 1], 1e-6, "Actual splatfield pick packed tuple mismatch");
    assert.ok(splatPick.worldPosition.every(Number.isFinite), "Actual splatfield pick should report a finite world position");

    pickScene.clearSplatFields();
    pickSplat.destroy();
    const actualSh0 = makeSequence(6, 0);
    const actualSh1 = makeSequence(18, 100);
    const actualSh2 = makeSequence(30, 200);
    const actualSh3 = makeSequence(42, 300);
    const pickSplatSH = wgpu.createSplatField({
        positions: new Float32Array([0, 0, 0, 0, 0, 1]),
        rotations: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
        scales: new Float32Array([0.35, 0.35, 0.35, 0.35, 0.35, 0.35]),
        opacities: new Float32Array([1, 1]),
        sh0: actualSh0, sh1: actualSh1, sh2: actualSh2, sh3: actualSh3, shDegree: 3,
        keepCPUData: true,
        ndShape: [2]
    });
    pickScene.add(pickSplatSH);
    const splatSHPick = await wgpu.pick(pickScene, pickCamera, canvas.clientWidth * 0.5, canvas.clientHeight * 0.5, { includeAttributes: true });
    assert.ok(splatSHPick, "Expected actual SH splatfield pick before render()");
    assert.strictEqual(splatSHPick.kind, "splatfield", "Expected actual SH renderer pick to return splatfield kind");
    assert.strictEqual(splatSHPick.elementIndex, 1, "Expected actual SH nearest splat footprint to win depth picking");
    assert.ok(splatSHPick.attributes, "Actual SH splatfield pick attributes should be present");
    assert.strictEqual(splatSHPick.attributes.sphericalHarmonicsDegree, 3, "Actual SH pick degree mismatch");
    arraysApproxEqual(splatSHPick.attributes.sphericalHarmonics, packSHRecord(1, actualSh0, actualSh1, actualSh2, actualSh3), 1e-6, "Actual SH pick coefficients mismatch");

    pickScene.destroy();
}

// 3) Selection stores implement replace, add, toggle, remove, apply, and clear semantics.
{
    const store = wgpu.createSelectionStore();
    assert.ok(store instanceof SelectionStore, "createSelectionStore() should return SelectionStore");

    const h0 = {
        kind: "pointcloud",
        object: cloud,
        objectId: 11,
        elementIndex: 0,
        worldPosition: [0, 0, 0],
        ndIndex: [0, 0],
        attributes: { scalar: 0.1, packedPoint: [0, 0, 0, 0.1] }
    };
    const h1 = {
        kind: "pointcloud",
        object: cloud,
        objectId: 11,
        elementIndex: 1,
        worldPosition: [1, 0, 0],
        ndIndex: [0, 1],
        attributes: { scalar: 0.2, packedPoint: [1, 0, 0, 0.2] }
    };
    const h2 = {
        kind: "glyphfield",
        object: field,
        objectId: 21,
        elementIndex: 1,
        worldPosition: [2, 1, 0],
        ndIndex: [0, 1],
        attributes: { vector: [4.5, 5.5, 6.5, 7.5] }
    };
    const h3 = {
        kind: "nodelink",
        object: link,
        objectId: 41,
        elementIndex: 2,
        worldPosition: [0, 1, 0],
        ndIndex: [1, 0],
        attributes: { component: "node", componentIndex: 2, scalar: 0.3 }
    };
    const h4 = {
        kind: "nodelink",
        object: link,
        objectId: 41,
        elementIndex: link.nodeCount + 1,
        worldPosition: [0.5, 1, 0],
        ndIndex: null,
        attributes: { component: "edge", componentIndex: 1, edgeEndpoints: [2, 3], scalar: 0.9 }
    };

    store.replace(h0);
    assert.strictEqual(store.size, 1, "replace() should clear and add exactly one hit");
    assert.strictEqual(store.has(11, 0), true, "replace() should include replacement hit");

    store.add([h1, h2]);
    assert.strictEqual(store.size, 3, "add() should perform union semantics");

    store.toggle(h1);
    assert.strictEqual(store.has(11, 1), false, "toggle() should remove existing entry");
    store.toggle(h1);
    assert.strictEqual(store.has(11, 1), true, "toggle() should add missing entry");

    store.remove([h0, h2]);
    assert.strictEqual(store.has(11, 0), false, "remove() should subtract entries");
    assert.strictEqual(store.has(21, 1), false, "remove() should subtract entries across object types");
    assert.strictEqual(store.size, 1, "remove() should preserve untouched entries");

    store.apply("replace", [h0, h2]);
    assert.strictEqual(store.size, 2, "apply(replace) should replace from many-hits input");

    store.add([h3, h4]);
    assert.strictEqual(store.has(41, 2), true, "Selection should include NodeLink node entry");
    assert.strictEqual(store.has(41, link.nodeCount + 1), true, "Selection should include NodeLink edge entry");
    store.toggle(h4);
    assert.strictEqual(store.has(41, link.nodeCount + 1), false, "Selection toggle should remove NodeLink edge entry");
    store.toggle(h4);
    assert.strictEqual(store.has(41, link.nodeCount + 1), true, "Selection toggle should re-add NodeLink edge entry");
    store.remove([h3, h4]);
    assert.strictEqual(store.has(41, 2), false, "Selection remove should clear NodeLink node entry");
    assert.strictEqual(store.has(41, link.nodeCount + 1), false, "Selection remove should clear NodeLink edge entry");

    store.clear();
    assert.strictEqual(store.size, 0, "clear() should empty selection state");
}

// 4) The static selection-store factory returns the public store type.
{
    const staticStore = Engine.createSelectionStore();
    assert.ok(staticStore instanceof SelectionStore, "WasmGPU.createSelectionStore() static helper should return SelectionStore");
}

// 5) Cleanup releases the engine and removes its real canvas before destroying the independently requested browser GPU device.
{
    wgpu.destroy();
    browserCanvases.restore();
    await destroyTestDevice(device);
}
