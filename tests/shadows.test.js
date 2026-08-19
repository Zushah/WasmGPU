/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createWebGPUCanvasDouble as createMockCanvas, runIntentionalWebGPUTeardown, setupTest } from "./utils/helpers.js";
import { AmbientLight, DirectionalLight, Geometry, Mesh, OrthographicCamera, PerspectiveCamera, PointLight, RenderEffects, Renderer, Scene, Skin, StandardMaterial, Transform, UnlitMaterial, WasmGPU, importGltf, initWebAssembly, loadGltf } from "../release/WasmGPU.js";

await setupTest({ initWebAssembly });

const readRgbData = async (renderer, canvas, width, height) => { const bytesPerRow = Math.ceil((width * 4) / 256) * 256; const buffer = renderer.gpu.device.createBuffer({ size: height * bytesPerRow, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }); const encoder = renderer.gpu.device.createCommandEncoder(); encoder.copyTextureToBuffer({ texture: canvas.lastCurrentTexture }, { buffer, bytesPerRow, rowsPerImage: height }, { width, height, depthOrArrayLayers: 1 }); renderer.gpu.queue.submit([encoder.finish()]); await buffer.mapAsync(GPUMapMode.READ); const bytes = new Uint8Array(buffer.getMappedRange()); const rgb = new Uint8Array(width * height * 3); for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const source = y * bytesPerRow + x * 4; const destination = (y * width + x) * 3; rgb[destination] = bytes[source]; rgb[destination + 1] = bytes[source + 1]; rgb[destination + 2] = bytes[source + 2]; } buffer.unmap(); buffer.destroy(); return rgb; };
const readRgb = async (renderer, canvas, width, height) => (await readRgbData(renderer, canvas, width, height)).reduce((sum, value) => sum + value, 0);
const pad4 = (value) => (value + 3) & ~3;
const makeGLB = (json, binary) => { const jsonBytes = new TextEncoder().encode(JSON.stringify(json)); const jsonLength = pad4(jsonBytes.byteLength), binaryLength = pad4(binary.byteLength); const output = new ArrayBuffer(12 + 8 + jsonLength + 8 + binaryLength); const view = new DataView(output), bytes = new Uint8Array(output); view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, output.byteLength, true); let offset = 12; view.setUint32(offset, jsonLength, true); view.setUint32(offset + 4, 0x4E4F534A, true); offset += 8; bytes.set(jsonBytes, offset); bytes.fill(0x20, offset + jsonBytes.byteLength, offset + jsonLength); offset += jsonLength; view.setUint32(offset, binaryLength, true); view.setUint32(offset + 4, 0x004E4942, true); offset += 8; bytes.set(new Uint8Array(binary), offset); return output; };

// 1) The effects facade exposes conservative defaults and directional-light-owned configuration.
{
    const effects = new RenderEffects();
    const sun = new DirectionalLight();
    assert.equal(effects.shadows.mapSize, 1024);
    assert.equal(effects.shadows.maxViews, 4);
    assert.equal(effects.shadows.filter, "pcf");
    assert.equal(effects.shadows.depthBias, 1);
    assert.equal(effects.shadows.depthBiasSlopeScale, 1.5);
    assert.equal(effects.shadows.depthBiasClamp, 0.0025);
    assert.equal(effects.shadows.isEnabled(sun), false);
    effects.shadows.enable(sun, { bias: 0.002, normalBias: 0.04, updateMode: "manual" });
    assert.equal(effects.shadows.isEnabled(sun), true);
    assert.equal(effects.shadows.get(sun).bias, 0.002);
    assert.equal(effects.shadows.get(sun).normalBias, 0.04);
    assert.equal(effects.shadows.get(sun).updateMode, "manual");
    assert.equal("dirty" in effects.shadows.get(sun), false);
    assert.equal("layer" in effects.shadows.get(sun), false);
    assert.equal(effects.shadows.needsUpdate(sun), true);
    const copy = effects.shadows.get(sun);
    copy.bias = 99;
    assert.equal(effects.shadows.get(sun).bias, 0.002, "Public configuration mutated renderer state");
    assert.throws(() => effects.shadows.enable(sun, { updateMode: "sometimes" }), /update mode/);
    assert.throws(() => effects.shadows.enable(sun, { bias: NaN }), /bias/);
    assert.throws(() => effects.shadows.enable(sun, { normalBias: -1 }), /normalBias/);
    assert.throws(() => { effects.shadows.depthBias = 1.5; }, /depthBias/);
    assert.throws(() => { effects.shadows.depthBias = 0x80000000; }, /depthBias/);
    assert.throws(() => { effects.shadows.depthBias = -0x80000001; }, /depthBias/);
    assert.throws(() => { effects.shadows.depthBiasSlopeScale = Infinity; }, /depthBiasSlopeScale/);
    assert.throws(() => { effects.shadows.depthBiasSlopeScale = Number.MAX_VALUE; }, /depthBiasSlopeScale/);
    assert.throws(() => { effects.shadows.depthBiasClamp = NaN; }, /depthBiasClamp/);
    assert.throws(() => { effects.shadows.depthBiasClamp = Number.MAX_VALUE; }, /depthBiasClamp/);
    assert.throws(() => effects.shadows.enable(sun, { distance: Infinity }), /distance/);
    assert.throws(() => effects.shadows.enable(sun, { volume: { center: [0, NaN, 0], width: 2 } }), /center/);
    assert.throws(() => new RenderEffects({ shadows: { filter: "blur" } }), /filter/);
    assert.throws(() => effects.shadows.enable(new PointLight()), /DirectionalLight/);
    assert.equal(effects.shadows.disable(sun), true);
    assert.equal(effects.shadows.disable(sun), false);
    effects.destroy();
    const runtime = await WasmGPU.create(createMockCanvas(32, 32));
    assert.ok(runtime.effects instanceof RenderEffects);
    assert.equal(runtime.effects.shadows.isEnabled(sun), false);
    await runIntentionalWebGPUTeardown(() => runtime.destroy());
}

// 2) Rasterized visibility darkens StandardMaterial direct light while leaving the scene's ambient floor visible.
{
    const canvas = createMockCanvas(64, 64, { additionalUsage: GPUTextureUsage.COPY_SRC });
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false, canvasFormat: "rgba8unorm" });
    const scene = new Scene({ background: [0, 0, 0] });
    const camera = new OrthographicCamera({ left: -5, right: 5, top: 5, bottom: -5, near: 0.1, far: 30 });
    camera.transform.setPosition(0, 10, 0);
    camera.lookAt(0, 0, 0);
    const sun = new DirectionalLight({ direction: [1, -2, 0], intensity: 3 });
    scene.addLight(new AmbientLight({ intensity: 0.12 })).addLight(sun);
    const floor = new Mesh(Geometry.box(8, 0.1, 8), new StandardMaterial({ color: [0.75, 0.75, 0.75], metallic: 0, roughness: 1 }));
    const caster = new Mesh(Geometry.box(1.5, 2, 1.5), new StandardMaterial({ color: [0.2, 0.4, 0.9], metallic: 0, roughness: 1 }));
    caster.transform.setPosition(0, 1.05, 0);
    scene.add(floor).add(caster);
    renderer.effects.shadows.enable(sun, { volume: { center: [0, 0, 0], width: 12, height: 12, depth: 30 }, bias: 0.0005, normalBias: 0.01 });
    renderer.render(scene, camera);
    const shadowed = await readRgb(renderer, canvas, 64, 64);
    renderer.effects.shadows.disable(sun);
    renderer.render(scene, camera);
    const unshadowed = await readRgb(renderer, canvas, 64, 64);
    assert.ok(unshadowed > shadowed + 100, `Shadow map did not reduce direct-light pixels: ${shadowed} vs ${unshadowed}`);
    assert.ok(shadowed > 1000, "Ambient illumination was incorrectly removed from the shadowed scene");
    scene.destroy();
    camera.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 3) Shadow resources are lazy, casters bypass camera draw-list culling, and mesh flags stay per object.
{
    const canvas = createMockCanvas(128, 128);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: true });
    const scene = new Scene();
    const camera = new PerspectiveCamera({ fov: 45, aspect: 1, autoAspect: false, near: 0.1, far: 20 });
    camera.transform.setPosition(0, 3, 6);
    camera.lookAt(0, 0, 0);
    const sun = new DirectionalLight({ direction: [-1, -2, -1] });
    scene.addLight(sun);
    const receiver = new Mesh(Geometry.box(4, 0.1, 4), new StandardMaterial({ color: [0.7, 0.7, 0.7] }));
    const offscreenCaster = new Mesh(Geometry.box(), new UnlitMaterial());
    offscreenCaster.transform.setPosition(50, 1, 0);
    scene.add(receiver).add(offscreenCaster);

    renderer.render(scene, camera);
    assert.equal(renderer.effects.shadows, renderer.effects.shadows);
    assert.equal(renderer.shadowRenderer.activeViewCount, 0);
    assert.equal(renderer.shadowRenderer.hasResources, false);
    const inactiveModelScratch = renderer.shadowRenderer.modelScratch;
    const inactiveViewScratch = renderer.shadowRenderer.viewScratch;
    renderer.render(scene, camera);
    assert.equal(renderer.shadowRenderer.modelScratch, inactiveModelScratch, "Inactive shadow preparation replaced its empty model scratch array");
    assert.equal(renderer.shadowRenderer.viewScratch, inactiveViewScratch, "Inactive shadow preparation replaced its empty view scratch array");

    renderer.effects.shadows.enable(sun, { volume: { center: [25, 0, 0], width: 60, height: 20, depth: 60 } });
    renderer.render(scene, camera);
    assert.equal(renderer.shadowRenderer.activeViewCount, 1);
    assert.equal(renderer.shadowRenderer.hasResources, true);
    assert.equal(renderer.shadowRenderer.hasCaster(offscreenCaster), true, "Camera-culled mesh was omitted from shadow casters");
    assert.equal(renderer.opaqueDrawList.find((item) => item.mesh === receiver).receiveShadow, true);

    offscreenCaster.castShadow = false;
    receiver.receiveShadow = false;
    renderer.render(scene, camera);
    assert.equal(renderer.shadowRenderer.hasCaster(offscreenCaster), false);
    assert.equal(renderer.opaqueDrawList.find((item) => item.mesh === receiver).receiveShadow, false);

    renderer.effects.shadows.disable(sun);
    renderer.render(scene, camera);
    assert.equal(renderer.shadowRenderer.activeViewCount, 0);
    assert.equal(renderer.shadowRenderer.hasResources, false);
    scene.destroy();
    camera.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 4) Manual updates, filtering, reconfiguration, warmup, and repeated enable/disable are deterministic.
{
    const renderer = await Renderer.create(createMockCanvas(64, 64), { antialias: false, frustumCulling: false });
    const scene = new Scene();
    const camera = new PerspectiveCamera({ aspect: 1, autoAspect: false, far: 50 });
    camera.transform.setPosition(0, 2, 5);
    camera.lookAt(0, 0, 0);
    const sun = new DirectionalLight({ direction: [0, -1, -1] });
    scene.addLight(sun);
    scene.add(new Mesh(Geometry.box(), new StandardMaterial()));
    renderer.effects.shadows.enable(sun, { updateMode: "manual", bias: 0.001, normalBias: 0.03 });
    assert.doesNotThrow(() => renderer.warmup(scene, camera));
    renderer.render(scene, camera);
    assert.equal(renderer.effects.shadows.needsUpdate(sun), false);
    const firstPreparation = renderer.shadowRenderer.casterPreparationSerial;
    renderer.render(scene, camera);
    assert.equal(renderer.shadowRenderer.casterPreparationSerial, firstPreparation, "Unchanged manual shadows repeated caster preparation");
    renderer.effects.shadows.requestUpdate(sun);
    assert.equal(renderer.effects.shadows.needsUpdate(sun), true);
    renderer.render(scene, camera);
    assert.equal(renderer.effects.shadows.needsUpdate(sun), false);
    assert.equal(renderer.shadowRenderer.casterPreparationSerial, firstPreparation + 1);
    const shadowTexture = renderer.shadowRenderer.texture;
    const pcfSampler = renderer.shadowRenderer.sampler;
    const filterPreparation = renderer.shadowRenderer.casterPreparationSerial;
    renderer.effects.shadows.filter = "hard";
    renderer.render(scene, camera);
    assert.equal(renderer.shadowRenderer.texture, shadowTexture, "Filter-only change recreated the shadow texture");
    assert.notEqual(renderer.shadowRenderer.sampler, pcfSampler, "Filter change did not select a new comparison sampler");
    assert.equal(renderer.shadowRenderer.casterPreparationSerial, filterPreparation, "Filter-only change regenerated a manual shadow map");
    const hardSampler = renderer.shadowRenderer.sampler;
    renderer.effects.shadows.filter = "pcf";
    renderer.render(scene, camera);
    assert.equal(renderer.shadowRenderer.texture, shadowTexture);
    assert.notEqual(renderer.shadowRenderer.sampler, hardSampler);
    assert.equal(renderer.shadowRenderer.casterPreparationSerial, filterPreparation);

    const previousCasterPipeline = renderer.shadowRenderer.pipelineStatic;
    const biasPreparation = renderer.shadowRenderer.casterPreparationSerial;
    renderer.effects.shadows.depthBias = 2;
    renderer.effects.shadows.depthBiasSlopeScale = 2.25;
    renderer.effects.shadows.depthBiasClamp = 0.004;
    renderer.render(scene, camera);
    assert.equal(renderer.shadowRenderer.casterPreparationSerial, biasPreparation + 1, "Raster depth-bias change did not dirty manual shadow maps");
    assert.notEqual(renderer.shadowRenderer.pipelineStatic, previousCasterPipeline, "Raster depth-bias change reused a pipeline with immutable old bias state");

    renderer.effects.shadows.mapSize = 256;
    renderer.effects.shadows.maxViews = 2;
    assert.doesNotThrow(() => renderer.render(scene, camera));
    assert.equal(renderer.shadowRenderer.hasResources, true);
    const standard = new StandardMaterial();
    for (const variant of [{}, { instanced: true }, { skinned: true }, { skinned8: true }]) {
        const code = standard.getShaderCode({ ...variant, shadows: true });
        assert.ok(code.includes("return shadow_visibility(light_index, world_position, geometric_normal, light_direction, world_position_dx, world_position_dy);"), "Shadow visibility hook was not replaced");
        assert.ok(code.includes("standard_direct_visibility(i, in.world_pos, geom_normal, l, shadow_world_dx, shadow_world_dy)"), "Shadow lookup does not use the geometric receiver normal");
        assert.ok(code.includes("depth_gradient"), "PCF receiver-plane depth compensation is missing");
        assert.equal(code.includes("return 1.0; }\n\nfn compute_range_attenuation"), false, "Default visibility hook survived shadow specialization");
        const info = await renderer.gpu.device.createShaderModule({ code }).getCompilationInfo();
        assert.equal(info.messages.filter((message) => message.type === "error").length, 0);
    }
    standard.destroy();
    renderer.effects.shadows.disable(sun);
    renderer.effects.shadows.enable(sun);
    assert.doesNotThrow(() => renderer.render(scene, camera));
    scene.destroy();
    camera.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
    assert.equal(renderer.shadowRenderer.hasResources, false);
}

// 5) Automatic fitting extends only light-space depth for an off-camera caster, and PCF visibly smooths its shadow edge.
{
    const canvas = createMockCanvas(96, 96, { additionalUsage: GPUTextureUsage.COPY_SRC });
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: true, canvasFormat: "rgba8unorm" });
    const scene = new Scene({ background: [0, 0, 0] });
    const camera = new OrthographicCamera({ left: -4, right: 4, top: 4, bottom: -4, near: 0.1, far: 30 });
    camera.transform.setPosition(0, 10, 0); camera.lookAt(0, 0, 0);
    const sun = new DirectionalLight({ direction: [0, -1, 0], intensity: 4 });
    scene.addLight(sun);
    const floor = new Mesh(Geometry.box(8, 0.1, 8), new StandardMaterial({ color: [0.8, 0.8, 0.8], metallic: 0, roughness: 1 }));
    const caster = new Mesh(Geometry.box(2.4, 1, 2.4), new StandardMaterial());
    caster.transform.setPosition(0, 13, 0);
    caster.transform.setRotationFromEuler(0, 0.4, 0);
    scene.add(floor).add(caster);
    renderer.effects.shadows.mapSize = 512;
    renderer.effects.shadows.filter = "hard";
    renderer.effects.shadows.enable(sun, { distance: 12, bias: 0.0003, normalBias: 0.005 });
    renderer.render(scene, camera);
    assert.equal(renderer.opaqueDrawList.some((item) => item.mesh === caster), false, "Caster unexpectedly entered the camera draw list");
    assert.equal(renderer.shadowRenderer.hasCaster(caster), true);
    const hard = await readRgbData(renderer, canvas, 96, 96);
    renderer.effects.shadows.filter = "pcf";
    renderer.render(scene, camera);
    const pcf = await readRgbData(renderer, canvas, 96, 96);
    const withCasterMatrix = renderer.shadowRenderer.getViewProjection(sun);
    let filteredPixels = 0;
    for (let i = 0; i < hard.length; i += 3) if (Math.abs(hard[i] - pcf[i]) + Math.abs(hard[i + 1] - pcf[i + 1]) + Math.abs(hard[i + 2] - pcf[i + 2]) > 3) filteredPixels++;
    assert.ok(filteredPixels > 10, `PCF did not visibly smooth the hard shadow edge (${filteredPixels} changed pixels)`);
    const shadowed = pcf.reduce((sum, value) => sum + value, 0);
    caster.castShadow = false;
    renderer.render(scene, camera);
    const withoutCasterMatrix = renderer.shadowRenderer.getViewProjection(sun);
    for (const index of [0, 1, 4, 5, 8, 9, 12, 13]) assert.ok(Math.abs(withCasterMatrix[index] - withoutCasterMatrix[index]) < 1e-6, "Caster-aware depth fitting unnecessarily expanded or shifted shadow XY");
    const unshadowed = await readRgb(renderer, canvas, 96, 96);
    assert.ok(unshadowed > shadowed + 100, `Off-camera caster produced no visible receiver shadow: ${shadowed} vs ${unshadowed}`);
    scene.destroy(); camera.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 6) Automatic fitting contains all eight perspective and orthographic frustum corners under oblique lighting.
{
    const renderer = await Renderer.create(createMockCanvas(64, 64), { antialias: false, frustumCulling: false });
    const project = (matrix, x, y, z) => {
        const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
        return [(matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w, (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w];
    };
    const corners = (camera, distance) => {
        const world = camera.transform.worldMatrix;
        const result = [];
        const perspective = camera instanceof PerspectiveCamera;
        const near = camera.near, far = perspective ? Math.min(camera.far, distance) : Math.min(camera.far, camera.near + distance);
        for (const z of [near, far]) {
            const top = perspective ? Math.tan(camera.fov * Math.PI / 360) * z : camera.top;
            const bottom = perspective ? -top : camera.bottom;
            const right = perspective ? top * camera.aspect : camera.right;
            const left = perspective ? -right : camera.left;
            for (const y of [bottom, top]) for (const x of [left, right]) result.push([world[12] + world[0] * x + world[4] * y - world[8] * z, world[13] + world[1] * x + world[5] * y - world[9] * z, world[14] + world[2] * x + world[6] * y - world[10] * z]);
        }
        return result;
    };
    for (const camera of [new PerspectiveCamera({ fov: 67, aspect: 1.7, autoAspect: false, near: 0.2, far: 45 }), new OrthographicCamera({ left: -4, right: 7, bottom: -3, top: 5, near: 0.2, far: 45 })]) {
        const scene = new Scene();
        const sun = new DirectionalLight({ direction: [-0.7, -1.4, 0.9] });
        camera.transform.setPosition(3, 4, 9); camera.lookAt(-1, 0, 2);
        scene.addLight(sun);
        renderer.effects.shadows.enable(sun, { distance: 30 });
        renderer.render(scene, camera);
        const matrix = renderer.shadowRenderer.getViewProjection(sun);
        for (const corner of corners(camera, 30)) {
            const [x, y] = project(matrix, ...corner);
            assert.ok(Math.abs(x) <= 1.00001 && Math.abs(y) <= 1.00001, `Frustum corner escaped shadow projection: ${x}, ${y}`);
        }
        camera.transform.setPosition(5, 5, 11); camera.lookAt(-1, 0, 2);
        renderer.render(scene, camera);
        const cameraMoved = renderer.shadowRenderer.getViewProjection(sun);
        assert.ok(cameraMoved.some((value, index) => Math.abs(value - matrix[index]) > 1e-5), "Camera motion did not update the automatic shadow view");
        sun.direction = [0.8, -1.1, -0.4];
        renderer.render(scene, camera);
        const lightMoved = renderer.shadowRenderer.getViewProjection(sun);
        assert.ok(lightMoved.some((value, index) => Math.abs(value - cameraMoved[index]) > 1e-5), "Light motion did not update the automatic shadow view");
        renderer.effects.shadows.disable(sun);
        scene.destroy(); camera.destroy();
    }
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 7) Indexed morph, skinned-4 morph, and skinned-8 morph casters all produce depth shadows on their first frame.
{
    const makeCaster = async (skin8) => {
        const chunks = [new Float32Array([-1, 0, 0, 1, 0, 0, 0, 2, 0]), new Float32Array([0, 0, 0, 0, 0, 0, 0.5, 0, 0]), new Uint32Array([0, 1, 2])];
        if (skin8 !== null) chunks.push(new Uint16Array(12), new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]));
        if (skin8) chunks.push(new Uint16Array(12), new Float32Array(12));
        let byteLength = 0;
        const offsets = chunks.map((chunk) => { const offset = byteLength; byteLength += pad4(chunk.byteLength); return offset; });
        const binary = new Uint8Array(byteLength);
        chunks.forEach((chunk, index) => binary.set(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength), offsets[index]));
        const bufferViews = chunks.map((chunk, index) => ({ buffer: 0, byteOffset: offsets[index], byteLength: chunk.byteLength }));
        const accessors = [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }, { bufferView: 1, componentType: 5126, count: 3, type: "VEC3" }, { bufferView: 2, componentType: 5125, count: 3, type: "SCALAR" }];
        const attributes = { POSITION: 0 };
        if (skin8 !== null) { attributes.JOINTS_0 = accessors.length; accessors.push({ bufferView: 3, componentType: 5123, count: 3, type: "VEC4" }); attributes.WEIGHTS_0 = accessors.length; accessors.push({ bufferView: 4, componentType: 5126, count: 3, type: "VEC4" }); }
        if (skin8) { attributes.JOINTS_1 = accessors.length; accessors.push({ bufferView: 5, componentType: 5123, count: 3, type: "VEC4" }); attributes.WEIGHTS_1 = accessors.length; accessors.push({ bufferView: 6, componentType: 5126, count: 3, type: "VEC4" }); }
        const meshNode = skin8 === null ? { mesh: 0, translation: [0, 0.05, 0] } : { mesh: 0, skin: 0, translation: [0, 0.05, 0] };
        const json = {
            asset: { version: "2.0" }, buffers: [{ byteLength }], bufferViews, accessors,
            meshes: [{ weights: [1], primitives: [{ attributes, indices: 2, targets: [{ POSITION: 1 }] }] }],
            nodes: skin8 === null ? [meshNode] : [{ name: "joint" }, meshNode],
            scenes: [{ nodes: skin8 === null ? [0] : [0, 1] }], scene: 0
        };
        if (skin8 !== null) json.skins = [{ joints: [0] }];
        return importGltf(await loadGltf(makeGLB(json, binary.buffer)), { addToScene: false, computeMissingNormals: false });
    };
    const canvas = createMockCanvas(96, 96, { additionalUsage: GPUTextureUsage.COPY_SRC });
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false, canvasFormat: "rgba8unorm" });
    for (const variant of [null, false, true]) {
        const imported = await makeCaster(variant);
        const caster = imported.meshes[0];
        const scene = new Scene({ background: [0, 0, 0] });
        const camera = new OrthographicCamera({ left: -4, right: 4, bottom: -4, top: 4, near: 0.1, far: 30 });
        camera.transform.setPosition(0, 10, 0); camera.lookAt(0, 0, 0);
        const sun = new DirectionalLight({ direction: [0, -1, -1], intensity: 4 });
        scene.addLight(sun).add(new Mesh(Geometry.box(8, 0.1, 8), new StandardMaterial({ color: [0.8, 0.8, 0.8], metallic: 0, roughness: 1 }))).add(caster);
        renderer.effects.shadows.enable(sun, { volume: { center: [0, 0, 0], width: 12, height: 12, depth: 30 }, normalBias: 0.002 });
        renderer.render(scene, camera);
        assert.equal(renderer.shadowRenderer.hasCaster(caster), true, "Imported morph mesh was omitted from the caster list");
        assert.equal(caster.geometry.isIndexed, true, `Morph caster index data was unavailable on its first shadow frame (indexCount=${caster.geometry.indexCount})`);
        if (variant !== null) assert.ok(caster.geometry.skinInfluenceBuffer, "Skinned morph influence data was unavailable on its first shadow frame");
        const shadowed = await readRgb(renderer, canvas, 96, 96);
        caster.castShadow = false;
        renderer.render(scene, camera);
        const unshadowed = await readRgb(renderer, canvas, 96, 96);
        assert.ok(unshadowed > shadowed + 20, `${variant === null ? "morph" : variant ? "skin-8 morph" : "skin-4 morph"} caster produced no visible shadow`);
        renderer.effects.shadows.disable(sun);
        scene.remove(caster);
        scene.destroy(); camera.destroy(); imported.destroy();
    }
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 8) Caster instancing, shared-material receiver state, emissive output, and skin preparation stay independent.
{
    const canvas = createMockCanvas(96, 96, { additionalUsage: GPUTextureUsage.COPY_SRC });
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false, canvasFormat: "rgba8unorm" });
    const scene = new Scene({ background: [0, 0, 0] });
    const camera = new PerspectiveCamera({ fov: 55, aspect: 1, autoAspect: false, near: 0.1, far: 40 });
    camera.transform.setPosition(0, 6, 10); camera.lookAt(0, 0, 0);
    const sunA = new DirectionalLight({ direction: [-1, -2, -1], intensity: 2 });
    const sunB = new DirectionalLight({ direction: [1, -2, 0], intensity: 1 });
    scene.addLight(sunA).addLight(sunB);
    const sharedMaterial = new StandardMaterial({ color: [0.6, 0.6, 0.6], emissive: [0.2, 0.05, 0.02], emissiveIntensity: 1 });
    const receiverGeometry = Geometry.box(3, 0.1, 3);
    const receives = new Mesh(receiverGeometry, sharedMaterial);
    receiverGeometry.retain(); sharedMaterial.retain();
    const ignores = new Mesh(receiverGeometry, sharedMaterial); ignores.receiveShadow = false;
    receives.transform.setPosition(-2, 0, 0); ignores.transform.setPosition(2, 0, 0);
    scene.add(receives).add(ignores);
    const casterGeometry = Geometry.box(0.8, 1.5, 0.8);
    const casterMaterial = new StandardMaterial();
    const casterA = new Mesh(casterGeometry, casterMaterial);
    casterGeometry.retain(); casterMaterial.retain();
    const casterB = new Mesh(casterGeometry, casterMaterial);
    casterA.transform.setPosition(-1, 1, 0); casterB.transform.setPosition(1, 1, 0);
    scene.add(casterA).add(casterB);
    const joint = new Transform();
    const skin = new Skin("shadow-cache", [joint], null);
    const skinGeometry = new Geometry({ positions: new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0]), indices: new Uint32Array([0, 1, 2]), joints: new Uint16Array(12), weights: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]) });
    const skinned = new Mesh(skinGeometry, new StandardMaterial()); skinned.skin = skin.createInstance(skinned.transform); scene.add(skinned);
    renderer.effects.shadows.enable(sunA); renderer.effects.shadows.enable(sunB);
    renderer.render(scene, camera);
    const pooledView = renderer.shadowRenderer.activeViews[0];
    const pooledCaster = renderer.shadowRenderer.casters[0];
    renderer.render(scene, camera);
    assert.equal(renderer.shadowRenderer.activeViews[0], pooledView, "Shadow view record was reallocated between frames");
    assert.equal(renderer.shadowRenderer.casters[0], pooledCaster, "Shadow caster record was reallocated between frames");
    assert.ok(renderer.shadowRenderer.instancedCasterRunCount >= 1, "Compatible static shadow casters were not instanced");
    assert.equal(renderer.frameSkinPreparationCount, 1, "One skin was prepared more than once across two shadow views and the main pass");
    const receivesItem = renderer.opaqueDrawList.find((item) => item.mesh === receives);
    const ignoresItem = renderer.opaqueDrawList.find((item) => item.mesh === ignores);
    assert.equal(receives.material, ignores.material);
    assert.notEqual(receivesItem.pipeline, ignoresItem.pipeline, "Shared material erased per-mesh receiveShadow specialization");
    const emissiveShadowed = await readRgb(renderer, canvas, 96, 96);
    renderer.effects.shadows.disable(sunA); renderer.effects.shadows.disable(sunB);
    sunA.intensity = 0; sunB.intensity = 0;
    renderer.render(scene, camera);
    const emissiveOnly = await readRgb(renderer, canvas, 96, 96);
    assert.ok(emissiveOnly > 100, "Emissive output disappeared without direct light");
    assert.ok(emissiveShadowed > emissiveOnly, "Direct lighting did not remain additive to emissive output");
    scene.destroy(); camera.destroy(); skin.dispose(); joint.dispose();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}

// 9) Picking does not allocate or prepare shadow rendering state.
{
    const renderer = await Renderer.create(createMockCanvas(64, 64), { antialias: false, frustumCulling: false });
    const scene = new Scene();
    const camera = new PerspectiveCamera({ aspect: 1, autoAspect: false });
    camera.transform.setPosition(0, 0, 5); camera.lookAt(0, 0, 0);
    const sun = new DirectionalLight(); scene.addLight(sun).add(new Mesh(Geometry.box(), new StandardMaterial()));
    renderer.effects.shadows.enable(sun);
    renderer.prepareSceneFrameBase(scene, camera);
    assert.equal(renderer.shadowRenderer.hasResources, false);
    assert.equal(renderer.shadowRenderer.casterPreparationSerial, 0);
    assert.throws(() => { renderer.effects.shadows.mapSize = renderer.gpu.device.limits.maxTextureDimension2D + 1; }, /device limit/);
    assert.throws(() => { renderer.effects.shadows.maxViews = renderer.gpu.device.limits.maxTextureArrayLayers + 1; }, /device limit/);
    assert.throws(() => { renderer.effects.shadows.maxViews = 1.5; }, /positive integer/);
    scene.destroy(); camera.destroy();
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
}
