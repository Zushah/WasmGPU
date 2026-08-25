/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, createBrowserCanvasScope, createWebGPUCanvasDouble as createMockCanvas, runIntentionalWebGPUTeardown, setupTest } from "./utils/helpers.js";
import { initWebAssembly, WasmGPU, Renderer, Scene, PerspectiveCamera, Geometry, Mesh, UnlitMaterial, StandardMaterial, CustomMaterial, DataMaterial, Texture2D, Skin, Transform, BlendMode, CullMode, PointCloud, GlyphField, NodeLink, AmbientLight, DirectionalLight, wasm, webassemblyInterop } from "../release/WasmGPU.js";

const baseGpu = navigator.gpu;
const originalRequestAdapter = baseGpu.requestAdapter.bind(baseGpu);
const capturedAdapterOptions = [];
const capturedDeviceDescriptors = [];
const wrappedRequestAdapter = async (options) => { capturedAdapterOptions.push(options); const adapter = await originalRequestAdapter(options); assert.ok(adapter, "Failed to acquire a WebGPU adapter"); const originalRequestDevice = adapter.requestDevice.bind(adapter); return { features: adapter.features, limits: adapter.limits, requestDevice: async (descriptor = {}) => { capturedDeviceDescriptors.push(descriptor); return await originalRequestDevice(descriptor); } }; };
baseGpu.requestAdapter = wrappedRequestAdapter;
const { numberApproxEqual } = createApproxHelpers();
const browserCanvases = createBrowserCanvasScope();
const createCamera = (aspect = 1) => { const camera = new PerspectiveCamera({ fov: 60, aspect, near: 0.1, far: 100 }); camera.transform.setPosition(0, 0, 5); return camera; };

await setupTest({ initWebAssembly });

// 1) Renderer creation configures WebGPU, canvas sizing, device limits, and GPU handles.
{
    const canvas = createMockCanvas(320, 160);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: false,
        canvasFormat: "rgba8unorm",
        powerPreference: "low-power",
        maxUniformBufferBindingSize: 16384
    });

    assert.equal(renderer.canvas, canvas);
    assert.equal(renderer.gpu.format, "rgba8unorm");
    assert.ok(renderer.gpu.device);
    assert.ok(renderer.gpu.queue);
    assert.equal(canvas.configureCalls.length, 1);
    assert.equal(canvas.width, 320);
    assert.equal(canvas.height, 160);
    numberApproxEqual(renderer.aspectRatio, 2);
    assert.equal(capturedAdapterOptions.at(-1).powerPreference, "low-power");
    assert.equal(capturedDeviceDescriptors.at(-1).requiredLimits.maxUniformBufferBindingSize, 16384);
    assert.ok(!Object.prototype.hasOwnProperty.call(capturedDeviceDescriptors.at(-1).requiredLimits, "maxSampledTexturesPerShaderStage"));
    assert.ok(!Object.prototype.hasOwnProperty.call(capturedDeviceDescriptors.at(-1).requiredLimits, "maxSamplersPerShaderStage"));

    canvas.clientWidth = 200;
    canvas.clientHeight = 50;
    renderer.resize();
    assert.equal(canvas.width, 200);
    assert.equal(canvas.height, 50);
    numberApproxEqual(renderer.aspectRatio, 4);
    renderer.enableGpuTiming(true);
    assert.equal(typeof renderer.isGpuTimingSupported, "boolean");
    assert.equal(renderer.gpuTimeNs === null || Number.isFinite(renderer.gpuTimeNs), true);
    renderer.enableGpuTiming(false);
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
    baseGpu.requestAdapter = originalRequestAdapter;
}

// 2) Render submits core mesh/material paths and updates GPU-side material state.
{
    const canvas = browserCanvases.createCanvas(256, 256);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false });
    const scene = new Scene({ background: [0.02, 0.03, 0.04] });
    const camera = createCamera();
    const unlit = new UnlitMaterial({ color: [0.8, 0.2, 0.1] });
    const standard = new StandardMaterial({
        color: [0.2, 0.6, 0.9],
        opacity: 0.6,
        metallic: 0.1,
        roughness: 0.7,
        blendMode: BlendMode.Transparent,
        cullMode: CullMode.None
    });
    const custom = new CustomMaterial({
        fragmentShader: `
            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4f {
                return vec4f(custom.gain, in.uv.x, in.uv.y, 1.0);
            }
        `,
        uniforms: { gain: { type: "f32", value: 0.5 } }
    });
    const data = new DataMaterial({
        data: new Float32Array([0, 0.5, 1]),
        scaleTransform: {
            componentCount: 1,
            componentIndex: 0,
            stride: 1,
            offset: 0,
            mode: "linear",
            clampMode: "range",
            domainMin: 0,
            domainMax: 1,
            clampMin: 0,
            clampMax: 1
        }
    });

    const meshA = new Mesh(Geometry.box(), unlit);
    const meshB = new Mesh(Geometry.triangle(), standard);
    const meshC = new Mesh(Geometry.triangle(), custom);
    const meshD = new Mesh(Geometry.triangle(), data);
    meshA.transform.setPosition(-1.5, 0, 0);
    meshB.transform.setPosition(1.5, 0, 0);
    meshC.transform.setPosition(0, 1.25, 0);
    meshD.transform.setPosition(0, -1.25, 0);
    scene.add(meshA).add(meshB).add(meshC).add(meshD);

    assert.doesNotThrow(() => renderer.render(scene, camera));
    await renderer.gpu.queue.onSubmittedWorkDone();
    numberApproxEqual(camera.aspect, 1);
    assert.ok(unlit.uniformBuffer);
    assert.ok(standard.uniformBuffer);
    assert.ok(custom.uniformBuffer);
    assert.ok(data.uniformBuffer);
    assert.ok(data.dataBuffer);
    assert.equal(unlit.dirty, false);
    assert.equal(standard.dirty, false);
    assert.equal(custom.dirty, false);
    assert.equal(data.dirty, false);
    assert.ok(meshA.geometry.positionBuffer);
    assert.ok(meshB.geometry.indexBuffer);

    scene.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 3) Frustum culling stats use the nested public shape and keep occlusion counts separate.
{
    const canvas = browserCanvases.createCanvas(192, 192);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: true, frustumCullingStats: true });
    const scene = new Scene();
    const camera = createCamera();
    const geometry = Geometry.box();
    const material = new UnlitMaterial();
    const near = new Mesh(geometry.retain(), material.retain());
    const far = new Mesh(geometry, material);
    far.transform.setPosition(10000, 0, 0);
    scene.add(near).add(far);

    renderer.render(scene, camera);
    assert.deepEqual(renderer.cullingStats, {
        frustum: { tested: 2, visible: 1 },
        occlusion: { tested: 0, visible: 0, occluded: 0 }
    });
    far.visible = false;
    renderer.render(scene, camera);
    assert.deepEqual(renderer.cullingStats, {
        frustum: { tested: 1, visible: 1 },
        occlusion: { tested: 0, visible: 0, occluded: 0 }
    });

    scene.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 4) The render path stays cold for occlusion bookkeeping when occlusion culling is disabled.
{
    const canvas = browserCanvases.createCanvas(160, 160);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false, occlusionCulling: false, occlusionCullingStats: true });
    const rendererAny = renderer;
    const scene = new Scene();
    const camera = createCamera();
    scene.add(new Mesh(Geometry.box(), new UnlitMaterial()));
    let buildCalls = 0;
    const origBuild = rendererAny.buildOcclusionFrameState.bind(rendererAny);
    rendererAny.buildOcclusionFrameState = function patchedBuild(...args) {
        buildCalls++;
        return origBuild(...args);
    };

    assert.doesNotThrow(() => renderer.render(scene, camera));
    assert.equal(buildCalls, 0);
    assert.deepEqual(renderer.cullingStats.occlusion, { tested: 0, visible: 0, occluded: 0 });

    scene.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 5) Render-only occlusion hooks do not run during pick or warmup, so picking stays exact and warmup stays unfiltered.
{
    const canvas = browserCanvases.createCanvas(160, 160);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false, occlusionCulling: true, occlusionCullingStats: true });
    const scene = new Scene();
    const camera = createCamera();
    let applyCalls = 0;
    let captureCalls = 0;
    const rendererAny = renderer;
    const origApply = rendererAny.applyRenderCullingAndStats.bind(rendererAny);
    rendererAny.applyRenderCullingAndStats = function patchedApply(...args) {
        applyCalls++;
        return origApply(...args);
    };
    rendererAny.captureOcclusionHierarchy = function patchedCapture() {
        captureCalls++;
    };

    renderer.render(scene, camera);
    assert.equal(applyCalls, 1);
    assert.equal(captureCalls, 1);
    await assert.doesNotReject(async () => renderer.pick(scene, camera, 32, 32));
    assert.equal(applyCalls, 1);
    assert.equal(captureCalls, 1);
    assert.doesNotThrow(() => renderer.warmup(scene, camera));
    assert.equal(applyCalls, 1);
    assert.equal(captureCalls, 1);

    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 6) Occlusion-enabled renders create capture resources and submit the capture path without throwing.
{
    const canvas = browserCanvases.createCanvas(192, 192);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false, occlusionCulling: true, occlusionCullingStats: true });
    const rendererAny = renderer;
    const scene = new Scene();
    const camera = createCamera();
    scene.add(new Mesh(Geometry.box(), new UnlitMaterial({ color: [0.7, 0.7, 0.7] })));
    let uncapturedError = null;
    rendererAny.device.addEventListener("uncapturederror", (e) => {
        uncapturedError = e?.error?.message ?? String(e);
    });

    assert.doesNotThrow(() => renderer.render(scene, camera));
    const firstCaptureSerial = rendererAny.occlusionCaptureSerial;
    assert.doesNotThrow(() => renderer.render(scene, camera));
    assert.equal(rendererAny.occlusionCaptureSerial, firstCaptureSerial, "Equivalent in-flight occlusion capture should be reused");
    if (typeof rendererAny.queue.onSubmittedWorkDone === "function") await rendererAny.queue.onSubmittedWorkDone();
    await Promise.all(rendererAny.occlusionReadbackSlots.map((slot) => slot.pending).filter(Boolean));
    assert.ok(rendererAny.occlusionHierarchyTexture);
    assert.ok(rendererAny.occlusionCaptureSerial >= 1);
    assert.ok(rendererAny.occlusionHierarchyWasmPtr, "Decoded hierarchy should have persistent renderer-owned WASM storage");
    assert.doesNotThrow(() => renderer.render(scene, camera));
    assert.equal(rendererAny.occlusionCaptureSerial, firstCaptureSerial, "Still-valid ready occlusion hierarchy should prevent recapture");
    camera.transform.setPosition(0.25, 0, 5);
    assert.doesNotThrow(() => renderer.render(scene, camera));
    assert.ok(rendererAny.occlusionCaptureSerial > firstCaptureSerial, "Camera changes should invalidate occlusion hierarchy reuse");
    assert.equal(uncapturedError, null);

    scene.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
    assert.equal(rendererAny.occlusionHierarchyWasmPtr, 0, "Renderer destruction should release persistent hierarchy storage");
    assert.equal(rendererAny.occlusionHierarchyWasmLength, 0);
}

// 7) Strict previous-frame validity skips occlusion filtering when the stored view-projection does not match.
{
    const canvas = browserCanvases.createCanvas(160, 160);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false, occlusionCulling: true, occlusionCullingStats: true });
    const rendererAny = renderer;
    const scene = new Scene();
    const camera = createCamera();
    scene.add(new Mesh(Geometry.box(), new UnlitMaterial()));

    rendererAny.prepareSceneFrameBase(scene, camera);
    const frameState = rendererAny.buildOcclusionFrameState();
    rendererAny.pendingOcclusionFrameState = frameState;
    rendererAny.ensureOcclusionResources();
    const layout = rendererAny.occlusionHierarchyLayout;
    assert.ok(layout);
    rendererAny.latestOcclusionHierarchy = {
        metadata: {
            resourceGeneration: rendererAny.occlusionResourceGeneration,
            viewportWidth: rendererAny.width,
            viewportHeight: rendererAny.height,
            hierarchyWidth: rendererAny.occlusionWidth,
            hierarchyHeight: rendererAny.occlusionHeight,
            cameraType: camera.type,
            occluderSignature: frameState.signature,
            viewProjection: new Float32Array(16), // deliberately invalid for the current frame
            layout
        },
        data: new Float32Array(layout.texelCount).fill(0.2)
    };
    rendererAny.latestOcclusionHierarchySerial = 1;
    rendererAny.applyRenderCullingAndStats(camera);

    assert.equal(rendererAny.opaqueDrawList.length, 1);
    assert.deepEqual(renderer.cullingStats.occlusion, { tested: 0, visible: 0, occluded: 0 });

    scene.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 8) Safe occluder capture classification keeps ambiguous coverage paths out of the capture set.
{
    const canvas = browserCanvases.createCanvas(200, 200);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false, occlusionCulling: true });
    const rendererAny = renderer;
    const scene = new Scene();
    const camera = createCamera();

    const safeMesh = new Mesh(Geometry.box(), new UnlitMaterial());
    const morphBaseMemory = new WebAssembly.Memory({ initial: 1 });
    const morphBaseModule = webassemblyInterop.fromMemory(morphBaseMemory, { name: "renderer:morph-occlusion-base" });
    const morphBaseNormals = new Float32Array(morphBaseMemory.buffer, 0, 9);
    morphBaseNormals.set([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const morphBaseNormalsView = morphBaseModule.view({ ptr: 0, length: 9, dtype: "f32", name: "renderer:morph-occlusion-normals" });
    const morphGeometry = new Geometry({
        positions: new Float32Array([-1, -1, 0, 1, -1, 0, 0, 1, 0]),
        wasmNormals: morphBaseNormalsView,
        morphTargets: [{ positions: new Float32Array([0, 0, 0, 0, 0, 0, 0, 0.5, 0]) }]
    });
    const morphMesh = new Mesh(morphGeometry, new UnlitMaterial());
    const alphaCutMesh = new Mesh(Geometry.box(), new UnlitMaterial({ alphaCutoff: 0.5 }));
    const customMesh = new Mesh(Geometry.box(), new CustomMaterial({
        fragmentShader: `
            @fragment
            fn fs_main(in: VertexOutput) -> @location(0) vec4f {
                return vec4f(in.uv, 0.0, 1.0);
            }
        `
    }));
    const safeCloud = new PointCloud({
        data: new Float32Array([0, 0, 0, 1]),
        basePointSize: 12,
        blendMode: BlendMode.Opaque,
        depthWrite: true,
        depthTest: true,
        scaleTransform: { componentCount: 4, componentIndex: 3, stride: 4, offset: 0 }
    });
    const additiveCloud = new PointCloud({
        data: new Float32Array([1, 0, 0, 1]),
        basePointSize: 12,
        blendMode: BlendMode.Additive,
        depthWrite: true,
        depthTest: true,
        scaleTransform: { componentCount: 4, componentIndex: 3, stride: 4, offset: 0 }
    });
    const safeGlyph = new GlyphField({
        geometry: Geometry.box(0.25, 0.25, 0.25),
        instanceCount: 1,
        positions: new Float32Array([0, 0, 0, 0]),
        rotations: new Float32Array([0, 0, 0, 1]),
        scales: new Float32Array([1, 1, 1, 0]),
        attributes: new Float32Array([1, 0, 0, 0]),
        colorMode: "scalar",
        blendMode: BlendMode.Opaque,
        depthWrite: true,
        depthTest: true,
        scaleTransform: { componentCount: 4, componentIndex: 0, stride: 4, offset: 0 }
    });
    const safeGraph = new NodeLink({
        nodePositions: new Float32Array([0, 0, 0, 1, 0, 0]),
        edges: new Uint16Array([0, 1]),
        blendMode: BlendMode.Opaque,
        depthWrite: true,
        depthTest: true
    });

    scene.add(safeMesh).add(morphMesh).add(alphaCutMesh).add(customMesh).add(safeCloud).add(additiveCloud).add(safeGlyph).add(safeGraph);
    rendererAny.prepareSceneFrameBase(scene, camera);
    const frameState = rendererAny.buildOcclusionFrameState();

    assert.equal(frameState.meshOccluders.length, 2);
    assert.equal(frameState.meshOccluders[0].mesh, safeMesh);
    assert.equal(frameState.meshOccluders[1].mesh, morphMesh);
    assert.equal(frameState.pointCloudOccluders.length, 1);
    assert.equal(frameState.pointCloudOccluders[0].cloud, safeCloud);
    assert.equal(frameState.glyphOccluders.length, 1);
    assert.equal(frameState.glyphOccluders[0].field, safeGlyph);
    assert.ok(frameState.nodeLinkOccluders.length >= 1);
    assert.ok(frameState.nodeLinkOccluders.every((item) => item.link === safeGraph));
    morphBaseNormals[0] = 0.25;
    morphGeometry.refreshWasmVertices();
    const changedMorphFrameState = rendererAny.buildOcclusionFrameState();
    assert.notEqual(changedMorphFrameState.signature, frameState.signature, "A morph-base geometry revision must invalidate occlusion reuse before bounds refresh observes the source change");

    scene.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 9) Picking APIs return stable empty and region result shapes.
{
    const renderer = await Renderer.create(browserCanvases.createCanvas(128, 128), { antialias: false, frustumCulling: false });
    const rendererAny = renderer;
    const scene = new Scene();
    const camera = createCamera();
    const geometry = Geometry.box();
    const material = new UnlitMaterial({ blendMode: BlendMode.Transparent, opacity: 0.5 });
    const farMesh = new Mesh(geometry.retain(), material.retain()); farMesh.transform.setPosition(0, 0, -4);
    const tieMesh = new Mesh(geometry, material); tieMesh.transform.setPosition(0, 0, 0);
    const makeCloud = (z) => { const cloud = new PointCloud({ data: new Float32Array([0, 0, 0, 1]), blendMode: BlendMode.Transparent, depthWrite: false, scaleTransform: { componentCount: 4, componentIndex: 3, stride: 4, offset: 0 } }); cloud.transform.setPosition(0, 0, z); return cloud; };
    const middleCloud = makeCloud(-2);
    const tieCloud = makeCloud(0);
    scene.add(farMesh).add(tieMesh).add(middleCloud).add(tieCloud);
    renderer.render(scene, camera);
    assert.deepEqual(rendererAny.transparentMergedDrawList.map((item) => "mesh" in item ? item.mesh : item.cloud), [farMesh, middleCloud, tieMesh, tieCloud], "Fixed-family merge should preserve exact global depth and type tie ordering");
    scene.remove(middleCloud).remove(tieCloud);
    renderer.render(scene, camera);
    assert.equal(rendererAny.transparentMergedDrawList.length, 0, "A single transparent family should execute without copying into the merged scratch list");
    middleCloud.destroy(); tieCloud.destroy();
    scene.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 10) Picking APIs return stable empty and region result shapes.
{
    const canvas = browserCanvases.createCanvas(128, 128);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false });
    const scene = new Scene();
    const camera = createCamera();

    assert.equal(await renderer.pick(scene, camera, 64, 64), null);
    const emptyRect = await renderer.pickRect(scene, camera, 0, 0, 16, 16, { maxHits: 4 });
    assert.equal(emptyRect.mode, "rect");
    assert.deepEqual(emptyRect.hits, []);
    assert.equal(emptyRect.truncated, false);
    assert.deepEqual(emptyRect.bounds, { x: 0, y: 0, width: 16, height: 16 });
    assert.equal(emptyRect.sampledPixels, 256);

    const emptyLasso = await renderer.pickLasso(scene, camera, [
        { x: 0, y: 0 },
        { x: 32, y: 0 },
        { x: 16, y: 32 }
    ], { maxHits: 2 });
    assert.equal(emptyLasso.mode, "lasso");
    assert.deepEqual(emptyLasso.hits, []);
    assert.equal(emptyLasso.truncated, false);
    assert.deepEqual(emptyLasso.bounds, { x: 0, y: 0, width: 32, height: 32 });
    assert.ok(emptyLasso.sampledPixels > 0);

    scene.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 10) SMAA render path and destroyed scene objects clean up without poisoning later frames.
{
    const canvas = createMockCanvas(160, 120);
    const renderer = await Renderer.create(canvas, { antialias: true, frustumCulling: false, canvasFormat: "rgba8unorm" });
    const scene = new Scene();
    const camera = createCamera();
    const mesh = new Mesh(Geometry.box(), new UnlitMaterial());
    scene.add(mesh);
    assert.equal(scene.meshes.length, 1);
    mesh.destroy();
    assert.equal(scene.meshes.length, 0);
    assert.doesNotThrow(() => renderer.render(scene, camera));
    assert.equal(canvas.currentTextureCount, 1);

    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 11) Warmup validates defaults and errors without acquiring a swapchain texture.
{
    assert.equal(typeof WasmGPU.prototype.warmup, "function");
    const canvas = createMockCanvas(256, 256);
    const wgpu = await WasmGPU.create(canvas, { antialias: false, frustumCulling: false, canvasFormat: "rgba8unorm" });
    const scene = wgpu.createScene([0, 0, 0]);
    const camera = wgpu.createCamera.perspective({ fov: 50, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 5);
    await assert.rejects(async () => wgpu.warmup({ compute: true }));
    await assert.rejects(async () => wgpu.warmup({ scene }));
    await assert.rejects(async () => wgpu.warmup({ camera }));
    await assert.doesNotReject(async () => wgpu.warmup({ render: false }));
    await assert.doesNotReject(async () => wgpu.warmup({ scene, camera }));
    assert.equal(canvas.currentTextureCount, 0);
    scene.destroy();
    await runIntentionalWebGPUTeardown(() => wgpu.destroy());
}

// 12) Warmup eagerly exercises visible render resource creation paths before the first render.
{
    const canvas = createMockCanvas(320, 240);
    const wgpu = await WasmGPU.create(canvas, { antialias: false, frustumCulling: false, canvasFormat: "rgba8unorm" });
    const scene = wgpu.createScene([0.01, 0.02, 0.03]);
    const camera = wgpu.createCamera.perspective({ fov: 55, near: 0.1, far: 200 });
    camera.transform.setPosition(0, 0, 12);
    camera.lookAt(0, 0, 0);
    const opaqueMaterial = wgpu.material.unlit({ color: [0.7, 0.7, 0.8] });
    const sharedGeometry = wgpu.geometry.box(0.8, 0.8, 0.8);
    const meshA = wgpu.createMesh(sharedGeometry.retain(), opaqueMaterial.retain());
    const meshB = wgpu.createMesh(sharedGeometry, opaqueMaterial);
    meshA.transform.setPosition(-2, 0, 0);
    meshB.transform.setPosition(-0.75, 0, 0);
    const skinnedGeometry = wgpu.geometry.custom({
        positions: new Float32Array([0, 0, 0, 0.6, 0, 0, 0, 0.6, 0]),
        normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
        uvs: new Float32Array([0, 0, 1, 0, 0, 1]),
        indices: new Uint32Array([0, 1, 2]),
        joints: new Uint16Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        weights: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])
    });
    const skinnedMesh = wgpu.createMesh(skinnedGeometry, wgpu.material.unlit({ color: [1.0, 0.8, 0.3] }));
    const joint = wgpu.createTransform();
    const skin = wgpu.animation.createSkin("WarmupSkin", [joint], null);
    skinnedMesh.skin = skin.createInstance(skinnedMesh.transform);
    skinnedMesh.transform.setPosition(0, -1.5, 0);
    const cloud = wgpu.createPointCloud({
        data: new Float32Array([-1, 1, 0, 0.1, -0.5, 1.5, 0, 0.2]),
        keepCPUData: true,
        ndShape: [1, 2],
        basePointSize: 10,
        blendMode: BlendMode.Opaque,
        depthWrite: true,
        scaleTransform: { componentCount: 4, componentIndex: 3, stride: 4, offset: 0 }
    });
    const field = wgpu.createGlyphField({
        geometry: wgpu.geometry.box(0.25, 0.25, 0.25),
        instanceCount: 2,
        positions: new Float32Array([2, 1, 0, 0, 2, 1.75, 0, 0]),
        rotations: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
        scales: new Float32Array([1, 1, 1, 0, 1, 1, 1, 0]),
        attributes: new Float32Array([0.2, 0.4, 0.6, 0.8, 0.5, 0.7, 0.9, 1.1]),
        keepCPUData: true,
        ndShape: [1, 2],
        scaleTransform: { componentCount: 4, componentIndex: 0, stride: 4, offset: 0 }
    });
    const graph = wgpu.createNodeLink({
        nodePositions: new Float32Array([-2, -1.5, 0, -1.25, -1.25, 0]),
        edges: new Uint16Array([0, 1]),
        nodeScalars: new Float32Array([0.25, 0.75]),
        edgeScalars: new Float32Array([0.5]),
        keepCPUData: true,
        ndShape: [1, 2]
    });
    scene.add(meshA).add(meshB).add(skinnedMesh).add(cloud).add(field).add(graph);
    await assert.doesNotReject(async () => wgpu.warmup({ scene, camera }));
    assert.equal(canvas.currentTextureCount, 0);
    assert.ok(sharedGeometry.positionBuffer);
    assert.ok(opaqueMaterial.bindGroup);
    assert.ok(cloud.bindGroup);
    assert.ok(field.bindGroup);
    assert.ok(graph.bindGroup);
    assert.ok(skinnedMesh.skin && skinnedMesh.skin.boneBuffer);
    assert.doesNotThrow(() => wgpu.render(scene, camera));
    assert.equal(canvas.currentTextureCount, 1);
    scene.destroy();
    await runIntentionalWebGPUTeardown(() => wgpu.destroy());
}

// 13) Transmission warmup prepares transmissive material binding without drawing a visible frame.
{
    const canvas = createMockCanvas(240, 180);
    const wgpu = await WasmGPU.create(canvas, { antialias: false, frustumCulling: false, canvasFormat: "rgba8unorm" });
    const scene = wgpu.createScene([0, 0, 0]);
    const camera = wgpu.createCamera.perspective({ fov: 50, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 5);
    camera.lookAt(0, 0, 0);
    const material = wgpu.material.standard({
        color: [0.8, 0.95, 1.0],
        opacity: 0.7,
        blendMode: BlendMode.Transparent,
        extensions: { transmission: { factor: 0.6 } }
    });
    const mesh = wgpu.createMesh(wgpu.geometry.sphere(0.6, 12, 8), material);
    scene.add(mesh);
    await assert.doesNotReject(async () => wgpu.warmup({ scene, camera }));
    assert.equal(canvas.currentTextureCount, 0);
    assert.ok(material.bindGroup);
    assert.doesNotThrow(() => wgpu.render(scene, camera));
    assert.equal(canvas.currentTextureCount, 1);
    scene.destroy();
    await runIntentionalWebGPUTeardown(() => wgpu.destroy());
}

// 14) Renderer culling growth and destruction release retained WebAssembly scratch blocks.
{
    const canvas = browserCanvases.createCanvas(160, 120);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: true });
    const scene = new Scene();
    const camera = createCamera(160 / 120);
    const meshes = [
        new Mesh(Geometry.triangle(), new UnlitMaterial()),
        new Mesh(Geometry.triangle(), new UnlitMaterial()),
        new Mesh(Geometry.triangle(), new UnlitMaterial())
    ];
    const originalFreeF32 = wasm.freeF32;
    const freedF32 = [];
    wasm.freeF32 = (ptr, len) => { freedF32.push([ptr, len]); originalFreeF32(ptr, len); };
    try {
        scene.add(meshes[0]);
        renderer.render(scene, camera);
        const first = { centersPtr: renderer.cullCentersPtr, radiiPtr: renderer.cullRadiiPtr, cap: renderer.cullCapacity };
        assert.ok(first.centersPtr > 0 && first.radiiPtr > 0 && first.cap >= 1);

        scene.add(meshes[1]).add(meshes[2]);
        renderer.render(scene, camera);
        assert.ok(renderer.cullCapacity >= 3);
        assert.ok(freedF32.some(([ptr, len]) => ptr === first.centersPtr && len === first.cap * 3), "Culling growth must free the replaced center block");
        assert.ok(freedF32.some(([ptr, len]) => ptr === first.radiiPtr && len === first.cap), "Culling growth must free the replaced radius block");

        const final = { centersPtr: renderer.cullCentersPtr, radiiPtr: renderer.cullRadiiPtr, cap: renderer.cullCapacity };
        scene.destroy();
        camera.destroy();
        await runIntentionalWebGPUTeardown(() => renderer.destroy());
        assert.ok(freedF32.some(([ptr, len]) => ptr === final.centersPtr && len === final.cap * 3), "Renderer.destroy() must free the final center block");
        assert.ok(freedF32.some(([ptr, len]) => ptr === final.radiiPtr && len === final.cap), "Renderer.destroy() must free the final radius block");
        assert.equal(renderer.cullCentersPtr, 0);
        assert.equal(renderer.cullRadiiPtr, 0);
        assert.equal(renderer.cullCapacity, 0);
    } finally {
        wasm.freeF32 = originalFreeF32;
        scene.destroy();
        camera.destroy();
        await runIntentionalWebGPUTeardown(() => renderer.destroy());
    }
}

// 15) Every standard mesh variant reverses normal-mapped tangent frames on back faces.
{
    const canvas = createMockCanvas(64, 64, { additionalUsage: GPUTextureUsage.COPY_SRC });
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false, canvasFormat: "rgba8unorm" });
    const readCenterPixel = async () => {
        const output = canvas.lastCurrentTexture;
        assert.ok(output, "Renderer did not expose its test output texture");
        const readback = renderer.gpu.device.createBuffer({ size: 256, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        const encoder = renderer.gpu.device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: output, origin: { x: 32, y: 32, z: 0 } }, { buffer: readback, bytesPerRow: 256, rowsPerImage: 1 }, { width: 1, height: 1, depthOrArrayLayers: 1 });
        renderer.gpu.queue.submit([encoder.finish()]);
        await readback.mapAsync(GPUMapMode.READ);
        const pixel = Array.from(new Uint8Array(readback.getMappedRange()).slice(0, 4));
        readback.unmap();
        readback.destroy();
        return pixel;
    };
    const createSolidTexture = async (rgba) => {
        const bitmap = await createImageBitmap(new ImageData(new Uint8ClampedArray(rgba), 1, 1), { premultiplyAlpha: "none", imageOrientation: "none", colorSpaceConversion: "none" });
        const texture = Texture2D.createFrom({ source: { kind: "bitmap", bitmap }, mipmaps: false });
        texture.ensureUploaded(renderer.gpu.device, renderer.gpu.queue, "linear");
        for (let i = 0; i < 100 && !texture.uploaded; i++) await new Promise((resolve) => setTimeout(resolve, 0));
        assert.ok(texture.uploaded, "Test texture did not upload");
        return { bitmap, texture };
    };
    const normalMap = await createSolidTexture([128, 128, 255, 255]);
    const anisotropyMap = await createSolidTexture([255, 128, 255, 255]);
    const whiteMap = await createSolidTexture([255, 255, 255, 255]);
    const blackMap = await createSolidTexture([0, 0, 0, 255]);
    const zeroMap = await createSolidTexture([0, 0, 0, 0]);
    const patternBitmap = await createImageBitmap(new ImageData(new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]), 2, 1), { premultiplyAlpha: "none", imageOrientation: "none", colorSpaceConversion: "none" });
    const patternTexture = Texture2D.createFrom({ source: { kind: "bitmap", bitmap: patternBitmap }, mipmaps: false, sampler: { addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge", magFilter: "nearest", minFilter: "nearest" } });
    patternTexture.ensureUploaded(renderer.gpu.device, renderer.gpu.queue, "linear");
    for (let i = 0; i < 100 && !patternTexture.uploaded; i++) await new Promise((resolve) => setTimeout(resolve, 0));
    assert.ok(patternTexture.uploaded, "Pattern test texture did not upload");
    const renderSide = async (variant, backFace, cullMode = CullMode.None) => {
        const scene = new Scene({ background: variant.background ?? [0, 0, 0] });
        scene.addLight(new AmbientLight({ intensity: 0 }));
        scene.addLight(new DirectionalLight({ direction: variant.lightDirection ?? (backFace ? [0, 0, 1] : [0, 0, -1]), intensity: 4 }));
        const base = Geometry.triangle(4, 4, "xy");
        const descriptor = { positions: base.positions.slice(), normals: base.normals.slice(), uvs: variant.uv0 ?? base.uvs.slice(), indices: base.indices.slice() };
        if (variant.uv1) descriptor.uvs1 = variant.uv1;
        if (variant.authoredTangent) descriptor.tangents = new Float32Array([1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1]);
        if (variant.skinned) {
            descriptor.joints = new Uint16Array(12);
            descriptor.weights = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
            if (variant.skinned8) {
                descriptor.joints1 = new Uint16Array(12);
                descriptor.weights1 = new Float32Array(12);
            }
        }
        const geometry = new Geometry(descriptor);
        base.destroy();
        const extensions = variant.extensions ?? {};
        const material = new StandardMaterial({ color: [1, 1, 1], metallic: 0, roughness: 1, cullMode, normalTexture: normalMap.texture, ...(variant.material ?? {}), extensions });
        const mesh = new Mesh(geometry, material);
        if (variant.mirrored) mesh.transform.setScale(-1, 1, 1);
        let skin = null;
        let joint = null;
        if (variant.skinned) {
            joint = new Transform();
            skin = new Skin(`renderer-${variant.name}`, [joint], null);
            mesh.skin = skin.createInstance(mesh.transform);
        }
        const camera = new PerspectiveCamera({ fov: 45, aspect: 1, near: 0.1, far: 20, autoAspect: false });
        camera.transform.setPosition(...(variant.cameraPosition ?? [0, 0, backFace ? -5 : 5]));
        camera.lookAt(0, 0, 0);
        scene.add(mesh);
        if (variant.instanced) {
            geometry.retain();
            material.retain();
            scene.add(new Mesh(geometry, material));
        }
        renderer.render(scene, camera);
        const pixel = await readCenterPixel();
        scene.destroy();
        camera.destroy();
        skin?.dispose();
        joint?.dispose();
        return pixel;
    };
    try {
        const variants = [
            { name: "ordinary derivative", authoredTangent: false },
            { name: "ordinary authored", authoredTangent: true },
            { name: "clearcoat normal", authoredTangent: true, extensions: { clearcoat: { factor: 1, roughness: 0.2, normalTexture: normalMap.texture } } },
            { name: "anisotropy", authoredTangent: true, extensions: { anisotropy: { strength: 1, texture: anisotropyMap.texture } } },
            { name: "transmission", authoredTangent: true, extensions: { transmission: { factor: 0.5, texture: whiteMap.texture } } },
            { name: "instanced", authoredTangent: true, instanced: true },
            { name: "skinned-4", authoredTangent: true, skinned: true },
            { name: "skinned-8", authoredTangent: true, skinned: true, skinned8: true },
            { name: "transmission-layout instanced", authoredTangent: true, instanced: true, extensions: { transmission: { factor: 0, texture: whiteMap.texture } } },
            { name: "transmission skinned-4", authoredTangent: true, skinned: true, extensions: { transmission: { factor: 0.5, texture: whiteMap.texture } } },
            { name: "transmission skinned-8", authoredTangent: true, skinned: true, skinned8: true, extensions: { transmission: { factor: 0.5, texture: whiteMap.texture } } },
            { name: "mirrored", authoredTangent: true, mirrored: true }
        ];
        for (const variant of variants) {
            const front = await renderSide(variant, false);
            const back = await renderSide(variant, true);
            assert.ok(front[0] > 40 && front[1] > 40 && front[2] > 40, `${variant.name} front face was unexpectedly dark: ${front}`);
            assert.ok(back[0] > 40 && back[1] > 40 && back[2] > 40, `${variant.name} back face did not receive reversed-frame lighting: ${back}`);
            for (let channel = 0; channel < 3; channel++) assert.ok(Math.abs(front[channel] - back[channel]) <= 4, `${variant.name} front/back channel mismatch: ${front} vs ${back}`);
        }
        const culledBack = await renderSide({ name: "single-sided", authoredTangent: false }, true, CullMode.Back);
        assert.ok(culledBack[0] <= 2 && culledBack[1] <= 2 && culledBack[2] <= 2, `Single-sided back face was not culled: ${culledBack}`);

        const textureCases = [
            { name: "clearcoat", off: { clearcoat: { factor: 1, texture: blackMap.texture, roughness: 0.15 } }, on: { clearcoat: { factor: 1, texture: whiteMap.texture, roughness: 0.15 } } },
            { name: "specular", material: { roughness: 0.25 }, off: { specular: { factor: 1, texture: zeroMap.texture } }, on: { specular: { factor: 1, texture: whiteMap.texture } } },
            { name: "sheen", material: { roughness: 1 }, lightDirection: [0.6, 0, -1], cameraPosition: [3, 0, 5], off: { sheen: { color: [1, 0.2, 0.1], colorTexture: blackMap.texture, roughness: 1 } }, on: { sheen: { color: [1, 0.2, 0.1], colorTexture: whiteMap.texture, roughness: 1 } } },
            { name: "iridescence", material: { color: [0.8, 0.3, 0.1], metallic: 0, roughness: 0.1 }, lightDirection: [0.6, 0, -1], cameraPosition: [4, 0, 5], off: { iridescence: { factor: 1, texture: blackMap.texture, thicknessMinimum: 400, thicknessMaximum: 400 } }, on: { iridescence: { factor: 1, texture: whiteMap.texture, thicknessMinimum: 400, thicknessMaximum: 400 } } },
            { name: "anisotropy", material: { metallic: 1, roughness: 0.35 }, lightDirection: [0.7, 0.3, -1], off: { anisotropy: { strength: 1, texture: blackMap.texture } }, on: { anisotropy: { strength: 1, texture: anisotropyMap.texture } } },
            { name: "transmission", background: [0.1, 0.3, 0.8], off: { transmission: { factor: 1, texture: blackMap.texture } }, on: { transmission: { factor: 1, texture: whiteMap.texture } } },
            { name: "transmission UV1", background: [0.1, 0.3, 0.8], uv0: new Float32Array([0.25, 0.5, 0.25, 0.5, 0.25, 0.5]), uv1: new Float32Array([0.75, 0.5, 0.75, 0.5, 0.75, 0.5]), off: { transmission: { factor: 1, texture: patternTexture, textureTransform: { texCoord: 0 } } }, on: { transmission: { factor: 1, texture: patternTexture, textureTransform: { texCoord: 1 } } } },
            { name: "transmission texture transform", background: [0.1, 0.3, 0.8], uv0: new Float32Array([0.25, 0.5, 0.25, 0.5, 0.25, 0.5]), off: { transmission: { factor: 1, texture: patternTexture } }, on: { transmission: { factor: 1, texture: patternTexture, textureTransform: { offset: [0.5, 0] } } } },
            { name: "volume thickness", background: [0.8, 0.8, 0.8], off: { transmission: { factor: 1 }, volume: { thicknessFactor: 1, thicknessTexture: blackMap.texture, attenuationDistance: 0.1, attenuationColor: [1, 0.05, 0.05] } }, on: { transmission: { factor: 1 }, volume: { thicknessFactor: 1, thicknessTexture: whiteMap.texture, attenuationDistance: 0.1, attenuationColor: [1, 0.05, 0.05] } } },
            { name: "diffuse transmission", background: [0.1, 0.3, 0.8], lightDirection: [0, 0, 1], off: { diffuseTransmission: { factor: 1, texture: zeroMap.texture, color: [1, 0.4, 0.2] } }, on: { diffuseTransmission: { factor: 1, texture: whiteMap.texture, color: [1, 0.4, 0.2] } } },
            { name: "diffuse transmission color", background: [0.1, 0.3, 0.8], lightDirection: [0, 0, 1], off: { diffuseTransmission: { factor: 1, color: [1, 1, 1], colorTexture: blackMap.texture } }, on: { diffuseTransmission: { factor: 1, color: [1, 1, 1], colorTexture: whiteMap.texture } } }
        ];
        for (const textureCase of textureCases) {
            const common = { name: textureCase.name, authoredTangent: true, material: textureCase.material, background: textureCase.background, lightDirection: textureCase.lightDirection, cameraPosition: textureCase.cameraPosition, uv0: textureCase.uv0, uv1: textureCase.uv1 };
            const off = await renderSide({ ...common, extensions: textureCase.off }, false);
            const on = await renderSide({ ...common, extensions: textureCase.on }, false);
            const difference = Math.abs(off[0] - on[0]) + Math.abs(off[1] - on[1]) + Math.abs(off[2] - on[2]);
            assert.ok(difference >= 1, `${textureCase.name} source texture did not affect rendered pixels: ${off} vs ${on}`);
        }
    } finally { normalMap.texture.destroy(); anisotropyMap.texture.destroy(); whiteMap.texture.destroy(); blackMap.texture.destroy(); zeroMap.texture.destroy(); patternTexture.destroy(); normalMap.bitmap.close(); anisotropyMap.bitmap.close(); whiteMap.bitmap.close(); blackMap.bitmap.close(); zeroMap.bitmap.close(); patternBitmap.close(); await runIntentionalWebGPUTeardown(() => renderer.destroy()); }
}

// 16) Packed model uniforms grow as one dynamic buffer, and static opaque instance runs reuse uploads with focused invalidation.
{
    const canvas = browserCanvases.createCanvas(128, 128);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false });
    const rendererAny = renderer;
    const scene = new Scene();
    const camera = createCamera();
    const geometry = Geometry.box();
    for (let i = 0; i < 70; i++) {
        if (i > 0) geometry.retain();
        const mesh = new Mesh(geometry, new UnlitMaterial({ color: [0.5 + i * 0.001, 0.5, 0.5] }));
        mesh.transform.setPosition((i % 10) * 0.02, Math.floor(i / 10) * 0.02, 0);
        scene.add(mesh);
    }
    const instanceGeometry = Geometry.box();
    const instanceMaterial = new UnlitMaterial();
    const meshes = [];
    for (let i = 0; i < 3; i++) {
        if (i > 0) { instanceGeometry.retain(); instanceMaterial.retain(); }
        const mesh = new Mesh(instanceGeometry, instanceMaterial);
        mesh.transform.setPosition(i * 0.1, -0.5, 0);
        meshes.push(mesh);
        scene.add(mesh);
    }
    renderer.render(scene, camera);
    assert.equal(rendererAny.modelUniformBuffers, undefined, "Legacy per-model GPU buffer pool should remain eliminated");
    assert.ok(rendererAny.modelUniformBindGroup, "Packed model submission should use one reusable global bind group");
    assert.equal(rendererAny.globalBindGroups, undefined, "The legacy global bind-group array should remain eliminated");
    assert.ok(rendererAny.modelUniformBufferCapacity >= 70, "Packed model buffer should grow for every non-instanced distinct transform");
    assert.equal(rendererAny.modelUniformSlots.size, 70);
    assert.equal(rendererAny.modelUniformStride % renderer.gpu.device.limits.minUniformBufferOffsetAlignment, 0);
    const uploadsAfterFirstFrame = rendererAny.instanceRunUploadCount;
    renderer.render(scene, camera);
    assert.equal(rendererAny.instanceRunUploadCount, uploadsAfterFirstFrame, "Unchanged opaque instance data should not be repacked or uploaded");
    meshes[0].transform.setPosition(0.5, 0, 0);
    renderer.render(scene, camera);
    assert.ok(rendererAny.instanceRunUploadCount > uploadsAfterFirstFrame, "Transform changes should invalidate static instance reuse");
    const uploadsAfterTransform = rendererAny.instanceRunUploadCount;
    meshes.at(-1).visible = false;
    renderer.render(scene, camera);
    assert.ok(rendererAny.instanceRunUploadCount > uploadsAfterTransform, "Run membership changes should invalidate static instance reuse");
    assert.ok(rendererAny.instanceRunCache.length > 0);
    meshes[0].visible = false;
    meshes[1].visible = false;
    renderer.render(scene, camera);
    assert.equal(rendererAny.instanceRunCache.length, 0, "Unused trailing instance-cache entries must release stale mesh references");
    scene.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 17) Cleanup removes every real canvas element created by renderer integration themes.
{
    browserCanvases.restore();
}
