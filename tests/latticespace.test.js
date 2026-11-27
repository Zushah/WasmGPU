/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, createBrowserCanvasScope, createWebGPUCanvasDouble, destroyTestDevice, readBufferAsF32, readBufferAsU32, runIntentionalWebGPUTeardown, setupTest, trackDestroy } from "./utils/helpers.js";
import * as WasmGPU from "../release/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers();
const browserCanvases = createBrowserCanvasScope();

let uncapturedError = null;
const { device } = await setupTest({ initWebAssembly: WasmGPU.initWebAssembly, webgpu: { onUncapturedError: (event) => { uncapturedError = event.error?.message ?? String(event.error); } } });

const { LatticeSpace, Scene, Renderer, PerspectiveCamera, BlendMode, CullMode, Compute, WasmMemoryView } = WasmGPU;
assert.ok(LatticeSpace, "Missing export: LatticeSpace");
assert.strictEqual(typeof WasmGPU.WasmGPU.prototype.createLatticeSpace, "function", "Missing WasmGPU.createLatticeSpace");

const compute = new Compute(device, device.queue);

const readF32 = (buffer, count, localCompute = compute) => readBufferAsF32(localCompute, buffer, count);
const readU32 = (buffer, count, localCompute = compute) => readBufferAsU32(localCompute, buffer, count);

// 1) Descriptor defaults, structural validation, and X-fastest indexing.
{
    const space = new LatticeSpace({ dimensions: [3, 2], data: new Float32Array(6), keepCPUData: true });
    assert.deepStrictEqual(space.dimensions, [3, 2]);
    assert.strictEqual(space.dimensionCount, 2);
    assert.strictEqual(space.cellCount, 6);
    assert.strictEqual(space.componentCount, 1);
    assert.strictEqual(space.colorMode, "scalar");
    assert.strictEqual(space.blendMode, BlendMode.Opaque);
    assert.deepStrictEqual(space.mapLinearIndexToCell(0), [0, 0]);
    assert.deepStrictEqual(space.mapLinearIndexToCell(2), [2, 0]);
    assert.deepStrictEqual(space.mapLinearIndexToCell(3), [0, 1]);
    assert.strictEqual(space.mapCellIndexToLinear([2, 1]), 5);
    assert.strictEqual(space.mapLinearIndexToCell(6), null);
    assert.throws(() => space.mapCellIndexToLinear([3, 0]), /outside dimensions/i);
    space.destroy();

    const volume = new LatticeSpace({ dimensions: [2, 3, 4], data: new Float32Array(24) });
    assert.deepStrictEqual(volume.mapLinearIndexToCell(17), [1, 2, 2]);
    assert.strictEqual(volume.mapCellIndexToLinear([1, 2, 2]), 17);
    volume.destroy();

    assert.throws(() => new LatticeSpace({ dimensions: [2], data: new Float32Array(2) }), /dimensions/i);
    assert.throws(() => new LatticeSpace({ dimensions: [2, 0], data: new Float32Array(2) }), /positive safe integers/i);
    assert.throws(() => new LatticeSpace({ dimensions: [2, 2], componentCount: 3, data: new Float32Array(11) }), /cellCount \* componentCount/i);
    assert.throws(() => new LatticeSpace({ dimensions: [2, 2], componentCount: 3, colorMode: "rgba", data: new Float32Array(12) }), /requires componentCount 4/i);
    assert.throws(() => new LatticeSpace({ dimensions: [2, 2], data: new Float32Array(4), wasmData: {} }), /mutually exclusive/i);
    assert.throws(() => new LatticeSpace({ dimensions: [2, 2], indexRange: { min: [1, 0], max: [1, 2] } }), /greater than/i);
    assert.throws(() => new LatticeSpace({ dimensions: [2, 2], spacing: [1, -1, 1] }), /positive values/i);
    assert.throws(() => new LatticeSpace({ dimensions: [2, 2], cellScale: 1.1 }), /<= 1/i);
    assert.throws(() => new LatticeSpace({ dimensions: [2, 2], componentCount: 2, scaleTransform: { componentIndex: 2 } }), /componentIndex/i);
    assert.throws(() => new LatticeSpace({ dimensions: [2, 2], componentCount: 2, scaleTransform: { componentCount: 3 } }), /componentCount/i);
}

// 2) Occlusion revisions invalidate every state change that can alter captured coverage.
{
    const space = new LatticeSpace({ dimensions: [1, 1, 2], componentCount: 2, data: new Float32Array(4) });
    const expectRevisionChange = (change) => {
        const previous = space.occluderRevision;
        change();
        assert.notStrictEqual(space.occluderRevision, previous);
    };
    expectRevisionChange(() => { space.valueRange = [0, 1]; });
    expectRevisionChange(() => { space.setScaleTransform({ valueMode: "magnitude", componentCount: 2 }); });
    expectRevisionChange(() => { space.colorMode = "solid"; });
    expectRevisionChange(() => { space.cullMode = CullMode.Front; });
    space.destroy();
}

// 3) Analytic local/world bounds follow origin, spacing, cell scale, clipping, and transform.
{
    const space = new LatticeSpace({ dimensions: [4, 3, 2], origin: [1, 2, 3], spacing: [2, 4, 6], cellScale: [0.5, 0.5, 0.5], indexRange: { min: [1, 1, 0], max: [4, 3, 2] }, colorMode: "solid" });
    const local = space.getLocalBounds();
    arraysApproxEqual(local.boxMin, [2.5, 5, 1.5], 1e-6, "local bounds min");
    arraysApproxEqual(local.boxMax, [7.5, 11, 10.5], 1e-6, "local bounds max");
    space.transform.setPosition(10, -2, 1);
    WasmGPU.Transform.updateAll();
    const world = space.getWorldBounds();
    arraysApproxEqual(world.boxMin, [12.5, 3, 2.5], 1e-6, "world bounds min");
    arraysApproxEqual(world.boxMax, [17.5, 9, 11.5], 1e-6, "world bounds max");
    space.destroy();
}

// 4) CPU upload, partial updates, mask upload, retained records, scale source, and uniforms.
{
    const values = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const mask = new Uint32Array([1, 0, 1, 1]);
    const space = new LatticeSpace({ dimensions: [2, 2], componentCount: 2, data: values, mask, keepCPUData: true, valueRange: [1, 10], opacity: 0.75, scaleTransform: { valueMode: "magnitude", domainMin: 0, domainMax: 10 } });
    space.updateData(new Float32Array([30, 40]), 1);
    space.updateMask(new Uint32Array([1]), 1);
    const record = space.getCellRecord(1);
    assert.deepStrictEqual(record.index, [1, 0]);
    assert.deepStrictEqual(record.center, [1, 0, 0]);
    assert.deepStrictEqual(record.values, [30, 40]);
    numberApproxEqual(record.scalar, 50);
    assert.strictEqual(record.active, true);
    space.upload(device, device.queue);
    assert.ok(space.dataBuffer);
    assert.ok(space.maskBuffer);
    arraysApproxEqual(await readF32(space.dataBuffer, 8), [1, 2, 30, 40, 5, 6, 7, 8], 0, "uploaded lattice data");
    assert.deepStrictEqual(Array.from(await readU32(space.maskBuffer, 4)), [1, 1, 1, 1]);
    assert.strictEqual(space.getScaleSourceDescriptor().count, 4);
    assert.strictEqual(space.getScaleSourceDescriptor().stride, 2);
    const uniforms = space.getUniformData();
    assert.strictEqual(uniforms.length * 4, space.getUniformBufferSize());
    assert.strictEqual(space.getUniformBufferSize(), 240, "LatticeSpace uniform buffer size should be 240 bytes (15 vec4<f32>)");
    assert.strictEqual(uniforms[33], 0, "filters reserved slot must stay zero");
    assert.deepStrictEqual(Array.from(uniforms.slice(0, 4)), [2, 2, 1, 2]);
    numberApproxEqual(uniforms[28], 0.75);
    space.dropCPUData();
    assert.strictEqual(space.getCellRecord(1).values.length, 0);
    assert.throws(() => space.updateData(new Float32Array([1, 2]), 0), /requires retained CPU data/i);
    space.destroy();
}

// 5) Wasm sources refresh explicitly and preserve GPU capacity where possible.
{
    const memory = new WebAssembly.Memory({ initial: 1 });
    const module = WasmGPU.webassemblyInterop.fromMemory(memory, { name: "latticespace:test" });
    const dataArray = new Float32Array(memory.buffer, 0, 8);
    const maskArray = new Uint32Array(memory.buffer, 64, 4);
    dataArray.set([1, 2, 3, 4, 5, 6, 7, 8]);
    maskArray.set([1, 1, 0, 1]);
    const dataView = module.view({ ptr: 0, length: 8, dtype: "f32", name: "data" });
    const maskView = module.view({ ptr: 64, length: 4, dtype: "u32", name: "mask" });
    assert.ok(dataView instanceof WasmMemoryView);
    assert.ok(maskView instanceof WasmMemoryView);
    const space = new LatticeSpace({ dimensions: [2, 2], componentCount: 2, wasmData: dataView, wasmMask: maskView, wasmCapacity: 8, keepCPUData: true });
    assert.deepStrictEqual(space.getCellRecord(2).values, [5, 6]);
    assert.strictEqual(space.getCellRecord(2).active, false);
    space.upload(device, device.queue);
    const dataBuffer = space.dataBuffer;
    dataArray.set([50, 60], 4);
    maskArray[2] = 1;
    space.refreshFromWasm({ keepCPUData: true });
    space.upload(device, device.queue);
    assert.strictEqual(space.dataBuffer, dataBuffer, "Wasm refresh should reuse grow-only capacity");
    assert.deepStrictEqual(space.getCellRecord(2).values, [50, 60]);
    assert.strictEqual(space.getCellRecord(2).active, true);
    space.destroy();

    const bad = module.view({ ptr: 0, length: 7, dtype: "f32", name: "bad" });
    assert.throws(() => new LatticeSpace({ dimensions: [2, 2], componentCount: 2, wasmData: bad }), /data length/i);
}

// 6) External GPU buffers are borrowed by default and owned only by explicit transfer.
{
    const makeBuffer = (size) => device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const borrowed = makeBuffer(16);
    const borrowedDestroyed = trackDestroy(borrowed);
    new LatticeSpace({ dimensions: [2, 2], dataBuffer: borrowed }).destroy();
    assert.strictEqual(borrowedDestroyed(), 0);
    borrowed.destroy();

    const owned = makeBuffer(16);
    const ownedDestroyed = trackDestroy(owned);
    new LatticeSpace({ dimensions: [2, 2], dataBuffer: owned, ownBuffers: true }).destroy();
    assert.strictEqual(ownedDestroyed(), 1);

    const small = makeBuffer(12);
    assert.throws(() => new LatticeSpace({ dimensions: [2, 2], dataBuffer: small }), /too small/i);
    small.destroy();
}

// 7) Scene sibling APIs, traversal, visibility, bounds, clearing, and destruction.
{
    const visible = new LatticeSpace({ dimensions: [2, 2], data: new Float32Array(4), name: "visible" });
    const hidden = new LatticeSpace({ dimensions: [1, 1, 1], colorMode: "solid", name: "hidden", visible: false, origin: [20, 0, 0] });
    const scene = new Scene();
    scene.add(visible).add(hidden).add(visible);
    assert.strictEqual(scene.latticeSpaces.length, 2);
    assert.strictEqual(scene.visibleLatticeSpaces.length, 1);
    assert.strictEqual(scene.findLatticeSpaceByName("visible"), visible);
    assert.strictEqual(scene.findAllLatticeSpacesByName("hidden").length, 1);
    let all = 0, shown = 0;
    scene.traverseLatticeSpaces(() => all++);
    scene.traverseVisibleLatticeSpaces(() => shown++);
    assert.deepStrictEqual([all, shown], [2, 1]);
    assert.ok(scene.getBounds({ visibleOnly: false }).boxMax[0] > 19);
    assert.ok(scene.getBounds({ visibleOnly: true }).boxMax[0] < 5);
    scene.remove(hidden);
    assert.strictEqual(scene.latticeSpaces.length, 1);
    scene.clearLatticeSpaces();
    assert.strictEqual(scene.latticeSpaces.length, 0);
    visible.destroy();
    hidden.destroy();
}

// 8) Real renderer coverage: procedural 2D/3D shaders, picking, private GPU sorting, state removal, and cleanup.
{
    const renderer = await Renderer.create(browserCanvases.createCanvas(192, 192), { antialias: false, frustumCulling: false, occlusionCulling: true });
    const rendererAny = renderer;
    const localCompute = new Compute(rendererAny.device, rendererAny.queue);
    rendererAny.device.addEventListener("uncapturederror", (event) => { uncapturedError = event?.error?.message ?? String(event); });
    const camera = new PerspectiveCamera({ fov: 55, aspect: 1, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 6);
    const plane = new LatticeSpace({ dimensions: [3, 3], data: new Float32Array([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]), cellScale: 0.9, keepCPUData: true });
    plane.transform.setPosition(-2, 0, 0);
    const volume = new LatticeSpace({ dimensions: [1, 1, 3], data: new Float32Array([0.2, 0.6, 1]), origin: [0, 0, -2], spacing: [1, 1, 1], cellScale: 0.8, blendMode: BlendMode.Transparent, depthWrite: false, opacity: 0.45, keepCPUData: true });
    volume.transform.rotateY(Math.PI);
    const scene = new Scene(); scene.add(plane).add(volume);
    uncapturedError = null;
    renderer.render(scene, camera);
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(uncapturedError, null, "LatticeSpace render emitted an uncaptured WebGPU error");
    assert.strictEqual(rendererAny.opaqueLatticeSpaceDrawList.length, 1);
    assert.strictEqual(rendererAny.transparentLatticeSpaceDrawList.length, 1);
    const state = rendererAny.latticeSpaceSortStates.get(volume);
    assert.ok(state?.sortedIndexBuffer, "Expected localized LatticeSpace sort state");
    assert.ok(rendererAny.latticeSortCapacity >= volume.drawCellCount);
    assert.deepStrictEqual(Array.from(await readU32(state.sortedIndexBuffer, 3, localCompute)), [2, 1, 0], "Expected transparent cells sorted back to front");
    assert.strictEqual(state.sortCount, 1);
    renderer.render(scene, camera);
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(state.sortCount, 1, "Stable LatticeSpace frames should reuse sorted indices");
    camera.transform.setPosition(0.25, 0, 6);
    renderer.render(scene, camera);
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(state.sortCount, 2, "Camera changes should invalidate LatticeSpace sorted-index reuse");
    camera.transform.setPosition(0, 0, 6);
    renderer.render(scene, camera);
    await rendererAny.queue.onSubmittedWorkDone();

    const hit = await renderer.pick(scene, camera, 96, 96);
    assert.ok(hit, "Expected center pick to hit the volume");
    assert.strictEqual(hit.kind, "latticespace");
    assert.strictEqual(hit.object, volume);
    assert.strictEqual(hit.elementIndex, 0);
    numberApproxEqual(hit.worldPosition[2], 2.4, 0.03, "Expected the outward-wound front voxel face to determine pick depth");

    const beforeRangeSorts = state.sortCount;
    volume.indexRange = { min: [0, 0, 1], max: [1, 1, 3] };
    renderer.render(scene, camera);
    await rendererAny.queue.onSubmittedWorkDone();
    assert.ok(state.sortCount > beforeRangeSorts, "LatticeSpace index-range changes should invalidate sorted-index reuse");

    volume.blendMode = BlendMode.Opaque;
    volume.depthWrite = true;
    volume.cellScale = 1;
    volume.cullMode = CullMode.Front;
    renderer.render(scene, camera);
    await rendererAny.queue.onSubmittedWorkDone();
    assert.deepStrictEqual(Array.from(await readU32(state.sortedIndexBuffer, 2, localCompute)), [1, 2], "Expected opaque identity indices to refresh after indexRange changes");

    const sortedDestroyed = trackDestroy(state.sortedIndexBuffer);
    const transformDestroyed = trackDestroy(state.transformBuffer);
    scene.remove(volume);
    renderer.render(scene, camera);
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(rendererAny.latticeSpaceSortStates.has(volume), false);
    assert.strictEqual(sortedDestroyed(), 1);
    assert.strictEqual(transformDestroyed(), 1);
    volume.destroy();

    const equalVolume = new LatticeSpace({ dimensions: [33, 33, 1], colorMode: "solid", solidColor: [0.4, 0.6, 0.8, 0.5], origin: [-0.16, -0.16, -2], spacing: [0.01, 0.01, 1], blendMode: BlendMode.Transparent, depthWrite: false });
    scene.add(equalVolume);
    renderer.render(scene, camera);
    await rendererAny.queue.onSubmittedWorkDone();
    const equalState = rendererAny.latticeSpaceSortStates.get(equalVolume);
    const equalOrder = await readU32(equalState.sortedIndexBuffer, 1089, localCompute);
    assert.deepStrictEqual(Array.from(equalOrder), Array.from({ length: 1089 }, (_, i) => i), "Specialized LatticeSpace radix sort should remain stable for large non-aligned equal-key input");
    scene.remove(equalVolume);
    equalVolume.destroy();

    renderer.render(scene, camera);
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(uncapturedError, null, "Occlusion-enabled LatticeSpace frame emitted an uncaptured WebGPU error");
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
    scene.destroy();
    localCompute.destroy();
}

// 9) Masked 3D cells are hidden from rendering and picking, including masks set after the first frame.
{
    const size = 64;
    const canvas = createWebGPUCanvasDouble(size, size, { additionalUsage: GPUTextureUsage.COPY_SRC });
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false });
    const rendererAny = renderer;
    rendererAny.device.addEventListener("uncapturederror", (event) => { uncapturedError = event?.error?.message ?? String(event); });
    const swapRedBlue = renderer.gpu.format.startsWith("bgra");
    const readRgb = async () => {
        const bytesPerRow = Math.ceil((size * 4) / 256) * 256;
        const buffer = rendererAny.device.createBuffer({ size: size * bytesPerRow, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        const encoder = rendererAny.device.createCommandEncoder();
        encoder.copyTextureToBuffer({ texture: canvas.lastCurrentTexture }, { buffer, bytesPerRow, rowsPerImage: size }, { width: size, height: size, depthOrArrayLayers: 1 });
        rendererAny.queue.submit([encoder.finish()]);
        await buffer.mapAsync(GPUMapMode.READ);
        const bytes = new Uint8Array(buffer.getMappedRange());
        const rgb = new Uint8Array(size * size * 3);
        for (let i = 0; i < size * size; i++) { const source = Math.floor(i / size) * bytesPerRow + (i % size) * 4; rgb[i * 3] = bytes[source + (swapRedBlue ? 2 : 0)]; rgb[i * 3 + 1] = bytes[source + 1]; rgb[i * 3 + 2] = bytes[source + (swapRedBlue ? 0 : 2)]; }
        buffer.unmap();
        buffer.destroy();
        return rgb;
    };
    const pixel = (rgb, x, y) => Array.from(rgb.subarray((y * size + x) * 3, (y * size + x) * 3 + 3));
    const camera = new PerspectiveCamera({ fov: 40, aspect: 1, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 8);
    camera.lookAt(0, 0, 0);
    const center = size / 2;
    const renderAndPick = async (scene) => {
        renderer.render(scene, camera);
        await rendererAny.queue.onSubmittedWorkDone();
        return renderer.pick(scene, camera, center, center);
    };
    const column = (descriptor) => new LatticeSpace({ dimensions: [1, 1, 3], origin: [0, 0, 0], spacing: [1, 1, 1], cellScale: 1, keepCPUData: true, ...descriptor });

    {
        const space = column({ data: new Float32Array([0.2, 0.5, 0.9]), mask: new Uint32Array([1, 1, 0]) });
        const scene = new Scene(); scene.add(space);
        uncapturedError = null;
        const hit = await renderAndPick(scene);
        assert.strictEqual(uncapturedError, null, "Masked lattice emitted an uncaptured WebGPU error");
        assert.ok(hit && hit.object === space && hit.elementIndex === 1, "Expected picking to pass through the masked front cell");
        scene.destroy();
    }

    const colors = new Float32Array([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1]);
    const visibleColumn = column({ componentCount: 4, colorMode: "rgba", data: colors });
    const maskedColumn = column({ componentCount: 4, colorMode: "rgba", data: colors, mask: new Uint32Array([1, 1, 0]) });
    const emptyColumn = column({ componentCount: 4, colorMode: "rgba", data: colors, mask: new Uint32Array(3) });
    for (const [space, expected, message] of [[visibleColumn, [0, 0, 255], "front cell"], [maskedColumn, [0, 255, 0], "middle cell behind the masked front cell"]]) {
        const scene = new Scene(); scene.add(space);
        renderer.render(scene, camera);
        await rendererAny.queue.onSubmittedWorkDone();
        const rgb = await readRgb();
        assert.deepStrictEqual(pixel(rgb, center, center), expected, `Expected the center pixel to show the ${message}`);
        assert.deepStrictEqual(pixel(rgb, 2, 2), [0, 0, 0], "Expected off-lattice pixels to show the background");
        scene.remove(space);
        scene.destroy();
        space.destroy();
    }
    const emptyScene = new Scene(); emptyScene.add(emptyColumn);
    renderer.render(emptyScene, camera);
    await rendererAny.queue.onSubmittedWorkDone();
    assert.ok((await readRgb()).every((value) => value === 0), "Expected a fully masked lattice to draw nothing");
    emptyScene.destroy();

    {
        const space = column({ data: new Float32Array([0.2, 0.5, 0.9]) });
        const scene = new Scene(); scene.add(space);
        const shown = await renderAndPick(scene);
        assert.ok(shown && shown.object === space && shown.elementIndex === 2, "Expected the unmasked lattice to hit its front cell");
        space.setMask(new Uint32Array([1, 1, 0]));
        const masked = await renderAndPick(scene);
        assert.ok(masked && masked.object === space && masked.elementIndex === 1, "Expected a mask set after the first frame to hide the front cell");
        space.setMaskBuffer(null);
        const unmasked = await renderAndPick(scene);
        assert.ok(unmasked && unmasked.object === space && unmasked.elementIndex === 2, "Expected removing the mask to restore the front cell");
        scene.destroy();
    }

    uncapturedError = null;
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
    camera.destroy();
}

// 10) Transparent 3D sort reuse follows only the geometry its keys read, and never reuses identity indices.
{
    const renderer = await Renderer.create(browserCanvases.createCanvas(96, 96), { antialias: false, frustumCulling: false });
    const rendererAny = renderer;
    const localCompute = new Compute(rendererAny.device, rendererAny.queue);
    rendererAny.device.addEventListener("uncapturederror", (event) => { uncapturedError = event?.error?.message ?? String(event); });
    const camera = new PerspectiveCamera({ fov: 40, aspect: 1, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, -8);
    camera.lookAt(0, 0, 0);
    const space = new LatticeSpace({ dimensions: [1, 1, 3], data: new Float32Array([0.2, 0.5, 0.9]), mask: new Uint32Array([1, 1, 1]), keepCPUData: true, blendMode: BlendMode.Transparent, depthWrite: false, opacity: 0.5 });
    const scene = new Scene(); scene.add(space);
    const frame = async () => { renderer.render(scene, camera); await rendererAny.queue.onSubmittedWorkDone(); return rendererAny.latticeSpaceSortStates.get(space); };
    uncapturedError = null;
    const state = await frame();
    assert.strictEqual(state.sortCount, 1);
    assert.deepStrictEqual(Array.from(await readU32(state.sortedIndexBuffer, 3, localCompute)), [2, 1, 0], "Expected a camera behind the column to sort its last cell first");
    const flat = [
        ["mask", () => space.setMask(new Uint32Array([1, 0, 1]))],
        ["data", () => space.setData(new Float32Array([0.9, 0.1, 0.4]))]
    ];
    for (const [label, change] of flat) {
        change();
        assert.strictEqual((await frame()).sortCount, 1, `LatticeSpace ${label} changes should not invalidate sorted-index reuse`);
    }
    space.origin = [0, 0, 0.25];
    assert.strictEqual((await frame()).sortCount, 2, "LatticeSpace origin changes should invalidate sorted-index reuse");
    space.spacing = [1, 1, 1.5];
    assert.strictEqual((await frame()).sortCount, 3, "LatticeSpace spacing changes should invalidate sorted-index reuse");
    space.blendMode = BlendMode.Opaque;
    space.depthWrite = true;
    await frame();
    assert.deepStrictEqual(Array.from(await readU32(state.sortedIndexBuffer, 3, localCompute)), [0, 1, 2], "Expected opaque LatticeSpaces to draw identity indices");
    space.blendMode = BlendMode.Transparent;
    space.depthWrite = false;
    assert.strictEqual((await frame()).sortCount, 4, "Expected a return to transparency to re-sort after identity indices were written");
    assert.deepStrictEqual(Array.from(await readU32(state.sortedIndexBuffer, 3, localCompute)), [2, 1, 0], "Expected the re-sorted order rather than stale identity indices");
    assert.strictEqual(uncapturedError, null, "LatticeSpace sort reuse frames emitted an uncaptured WebGPU error");
    await runIntentionalWebGPUTeardown(() => renderer.destroy());
    scene.destroy();
    camera.destroy();
    localCompute.destroy();
}

// 11) Cleanup removes real canvases and releases the shared compute context before its browser GPU device.
{
    browserCanvases.restore();
    compute.destroy();
    await destroyTestDevice(device);
}
