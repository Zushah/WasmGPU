/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, createBrowserCanvasScope, createWebGPUCanvasDouble as createMockCanvas, setupTest } from "./utils/helpers.js";
import { initWebAssembly, WasmGPU, Renderer, Scene, PerspectiveCamera, Geometry, Mesh, UnlitMaterial, StandardMaterial, CustomMaterial, DataMaterial, BlendMode, CullMode, PointCloud, GlyphField, NodeLink, wasm } from "../dist/WasmGPU.js";

const baseGpu = navigator.gpu;
const originalRequestAdapter = baseGpu.requestAdapter.bind(baseGpu);
const capturedAdapterOptions = [];
const capturedDeviceDescriptors = [];
const wrappedRequestAdapter = async (options) => {
    capturedAdapterOptions.push(options);
    const adapter = await originalRequestAdapter(options);
    assert.ok(adapter, "Failed to acquire a WebGPU adapter");
    const originalRequestDevice = adapter.requestDevice.bind(adapter);
    return {
        features: adapter.features,
        limits: adapter.limits,
        requestDevice: async (descriptor = {}) => {
            capturedDeviceDescriptors.push(descriptor);
            return await originalRequestDevice(descriptor);
        }
    };
};
baseGpu.requestAdapter = wrappedRequestAdapter;

const { numberApproxEqual } = createApproxHelpers();
const browserCanvases = createBrowserCanvasScope();

const createCamera = (aspect = 1) => {
    const camera = new PerspectiveCamera({ fov: 60, aspect, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 5);
    return camera;
};

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
    renderer.destroy();
    baseGpu.requestAdapter = originalRequestAdapter;
}

// 2) Render submits core mesh/material paths and updates GPU-side material state.
{
    const canvas = browserCanvases.createCanvas(256, 256);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: false,
        canvasFormat: "rgba8unorm"
    });
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
    renderer.destroy();
}

// 3) Frustum culling stats use the nested public shape and keep occlusion counts separate.
{
    const canvas = browserCanvases.createCanvas(192, 192);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: true,
        frustumCullingStats: true,
        canvasFormat: "rgba8unorm"
    });
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
    renderer.destroy();
}

// 4) The render path stays cold for occlusion bookkeeping when occlusion culling is disabled.
{
    const canvas = browserCanvases.createCanvas(160, 160);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: false,
        occlusionCulling: false,
        occlusionCullingStats: true,
        canvasFormat: "rgba8unorm"
    });
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
    renderer.destroy();
}

// 5) Render-only occlusion hooks do not run during pick or warmup, so picking stays exact and warmup stays unfiltered.
{
    const canvas = browserCanvases.createCanvas(160, 160);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: false,
        occlusionCulling: true,
        occlusionCullingStats: true,
        canvasFormat: "rgba8unorm"
    });
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

    renderer.destroy();
}

// 6) Occlusion-enabled renders create capture resources and submit the capture path without throwing.
{
    const canvas = browserCanvases.createCanvas(192, 192);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: false,
        occlusionCulling: true,
        occlusionCullingStats: true,
        canvasFormat: "rgba8unorm"
    });
    const rendererAny = renderer;
    const scene = new Scene();
    const camera = createCamera();
    scene.add(new Mesh(Geometry.box(), new UnlitMaterial({ color: [0.7, 0.7, 0.7] })));
    let uncapturedError = null;
    rendererAny.device.addEventListener("uncapturederror", (e) => {
        uncapturedError = e?.error?.message ?? String(e);
    });

    assert.doesNotThrow(() => renderer.render(scene, camera));
    if (typeof rendererAny.queue.onSubmittedWorkDone === "function") await rendererAny.queue.onSubmittedWorkDone();
    await Promise.resolve();
    assert.ok(rendererAny.occlusionHierarchyTexture);
    assert.ok(rendererAny.occlusionCaptureSerial >= 1);
    assert.equal(uncapturedError, null);

    scene.destroy();
    renderer.destroy();
}

// 7) Strict previous-frame validity skips occlusion filtering when the stored view-projection does not match.
{
    const canvas = browserCanvases.createCanvas(160, 160);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: false,
        occlusionCulling: true,
        occlusionCullingStats: true,
        canvasFormat: "rgba8unorm"
    });
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
    renderer.destroy();
}

// 8) Safe occluder capture classification keeps ambiguous coverage paths out of the capture set.
{
    const canvas = browserCanvases.createCanvas(200, 200);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: false,
        occlusionCulling: true,
        canvasFormat: "rgba8unorm"
    });
    const rendererAny = renderer;
    const scene = new Scene();
    const camera = createCamera();

    const safeMesh = new Mesh(Geometry.box(), new UnlitMaterial());
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

    scene.add(safeMesh).add(alphaCutMesh).add(customMesh).add(safeCloud).add(additiveCloud).add(safeGlyph).add(safeGraph);
    rendererAny.prepareSceneFrameBase(scene, camera);
    const frameState = rendererAny.buildOcclusionFrameState();

    assert.equal(frameState.meshOccluders.length, 1);
    assert.equal(frameState.meshOccluders[0].mesh, safeMesh);
    assert.equal(frameState.pointCloudOccluders.length, 1);
    assert.equal(frameState.pointCloudOccluders[0].cloud, safeCloud);
    assert.equal(frameState.glyphOccluders.length, 1);
    assert.equal(frameState.glyphOccluders[0].field, safeGlyph);
    assert.ok(frameState.nodeLinkOccluders.length >= 1);
    assert.ok(frameState.nodeLinkOccluders.every((item) => item.link === safeGraph));

    scene.destroy();
    renderer.destroy();
}

// 9) Picking APIs return stable empty and region result shapes.
{
    const canvas = browserCanvases.createCanvas(128, 128);
    const renderer = await Renderer.create(canvas, {
        antialias: false,
        frustumCulling: false,
        canvasFormat: "rgba8unorm"
    });
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
    renderer.destroy();
}

// 10) SMAA render path and destroyed scene objects clean up without poisoning later frames.
{
    const canvas = createMockCanvas(160, 120);
    const renderer = await Renderer.create(canvas, {
        antialias: true,
        frustumCulling: false,
        canvasFormat: "rgba8unorm"
    });
    const scene = new Scene();
    const camera = createCamera();
    const mesh = new Mesh(Geometry.box(), new UnlitMaterial());
    scene.add(mesh);
    assert.equal(scene.meshes.length, 1);
    mesh.destroy();
    assert.equal(scene.meshes.length, 0);
    assert.doesNotThrow(() => renderer.render(scene, camera));
    assert.equal(canvas.currentTextureCount, 1);

    renderer.destroy();
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
    wgpu.destroy();
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
    wgpu.destroy();
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
    wgpu.destroy();
}

// 14) Renderer culling growth and destruction release retained WebAssembly scratch blocks.
{
    const canvas = browserCanvases.createCanvas(160, 120);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: true, canvasFormat: "rgba8unorm" });
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
        renderer.destroy();
        assert.ok(freedF32.some(([ptr, len]) => ptr === final.centersPtr && len === final.cap * 3), "Renderer.destroy() must free the final center block");
        assert.ok(freedF32.some(([ptr, len]) => ptr === final.radiiPtr && len === final.cap), "Renderer.destroy() must free the final radius block");
        assert.equal(renderer.cullCentersPtr, 0);
        assert.equal(renderer.cullRadiiPtr, 0);
        assert.equal(renderer.cullCapacity, 0);
    } finally {
        wasm.freeF32 = originalFreeF32;
        scene.destroy();
        camera.destroy();
        renderer.destroy();
    }
}

// 15) Cleanup removes every real canvas element created by renderer integration themes.
{
    browserCanvases.restore();
}
