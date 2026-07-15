/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "assert";
import * as WasmGPU from "../dist/WasmGPU.js";
import { create, globals } from "webgpu";

Object.assign(globalThis, globals);
const gpu = create([]);
Object.defineProperty(globalThis, "navigator", { value: { gpu }, configurable: true });
if (!globalThis.window) globalThis.window = {};
globalThis.window.devicePixelRatio = 1;

const makeCanvas = (width = 192, height = 192) => {
    const canvas = {
        width, height, clientWidth: width, clientHeight: height, style: {},
        addEventListener() {}, removeEventListener() {},
        getBoundingClientRect() { return { left: 0, top: 0, right: this.clientWidth, bottom: this.clientHeight, width: this.clientWidth, height: this.clientHeight }; }
    };
    let device = null;
    let format = "rgba8unorm";
    const context = {
        configure(descriptor) { device = descriptor.device; format = descriptor.format ?? format; },
        unconfigure() { device = null; },
        getCurrentTexture() {
            assert.ok(device, "GPUCanvasContext must be configured");
            return device.createTexture({ size: { width: canvas.width, height: canvas.height, depthOrArrayLayers: 1 }, format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC });
        }
    };
    canvas.getContext = (kind) => kind === "webgpu" ? context : null;
    return canvas;
};

const approx = (actual, expected, tolerance = 1e-6, message = "Numbers differ") => assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
const approxArray = (actual, expected, tolerance = 1e-6, message = "Arrays differ") => { assert.strictEqual(actual.length, expected.length, `${message}: length`); for (let i = 0; i < actual.length; i++) approx(actual[i], expected[i], tolerance, `${message} at ${i}`); };
const trackDestroy = (buffer) => { let count = 0; const destroy = buffer.destroy.bind(buffer); buffer.destroy = () => { count++; destroy(); }; return () => count; };

await WasmGPU.initWebAssembly(new URL("../dist/", import.meta.url).toString());
const { LatticeSpace, Scene, Renderer, PerspectiveCamera, BlendMode, CullMode, Compute, WasmMemoryView } = WasmGPU;
assert.ok(LatticeSpace, "Missing export: LatticeSpace");
assert.strictEqual(typeof WasmGPU.WasmGPU.prototype.createLatticeSpace, "function", "Missing WasmGPU.createLatticeSpace");

const adapter = await gpu.requestAdapter();
assert.ok(adapter, "Failed to acquire WebGPU adapter");
const device = await adapter.requestDevice();
const compute = new Compute(device, device.queue);
let uncapturedError = null;
device.addEventListener("uncapturederror", (event) => { uncapturedError = event?.error?.message ?? String(event); });

const readF32 = async (buffer, count, localCompute = compute) => { const output = localCompute.createStorageBuffer({ byteLength: count * 4, copySrc: true }); try { localCompute.kernels.copyF32(buffer, { out: output, count }); return await output.readAs(Float32Array); } finally { output.destroy(); } };
const readU32 = async (buffer, count, localCompute = compute) => { const output = localCompute.createStorageBuffer({ byteLength: count * 4, copySrc: true }); try { localCompute.kernels.copyU32(buffer, { out: output, count }); return await output.readAs(Uint32Array); } finally { output.destroy(); } };

// Descriptor defaults, structural validation, and X-fastest indexing.
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

// Occlusion revisions invalidate every state change that can alter captured coverage.
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

// Analytic local/world bounds follow origin, spacing, cell scale, clipping, and transform.
{
    const space = new LatticeSpace({ dimensions: [4, 3, 2], origin: [1, 2, 3], spacing: [2, 4, 6], cellScale: [0.5, 0.5, 0.5], indexRange: { min: [1, 1, 0], max: [4, 3, 2] }, colorMode: "solid" });
    const local = space.getLocalBounds();
    approxArray(local.boxMin, [2.5, 5, 1.5], 1e-6, "local bounds min");
    approxArray(local.boxMax, [7.5, 11, 10.5], 1e-6, "local bounds max");
    space.transform.setPosition(10, -2, 1);
    WasmGPU.Transform.updateAll();
    const world = space.getWorldBounds();
    approxArray(world.boxMin, [12.5, 3, 2.5], 1e-6, "world bounds min");
    approxArray(world.boxMax, [17.5, 9, 11.5], 1e-6, "world bounds max");
    space.destroy();
}

// CPU upload, partial updates, mask upload, retained records, scale source, and uniforms.
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
    approx(record.scalar, 50);
    assert.strictEqual(record.active, true);
    space.upload(device, device.queue);
    assert.ok(space.dataBuffer);
    assert.ok(space.maskBuffer);
    approxArray(await readF32(space.dataBuffer, 8), [1, 2, 30, 40, 5, 6, 7, 8], 0, "uploaded lattice data");
    assert.deepStrictEqual(Array.from(await readU32(space.maskBuffer, 4)), [1, 1, 1, 1]);
    assert.strictEqual(space.getScaleSourceDescriptor().count, 4);
    assert.strictEqual(space.getScaleSourceDescriptor().stride, 2);
    const uniforms = space.getUniformData();
    assert.strictEqual(uniforms.length * 4, space.getUniformBufferSize());
    assert.deepStrictEqual(Array.from(uniforms.slice(0, 4)), [2, 2, 1, 2]);
    approx(uniforms[28], 0.75);
    space.dropCPUData();
    assert.strictEqual(space.getCellRecord(1).values.length, 0);
    assert.throws(() => space.updateData(new Float32Array([1, 2]), 0), /requires retained CPU data/i);
    space.destroy();
}

// Wasm sources refresh explicitly and preserve GPU capacity where possible.
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

// External GPU buffers are borrowed by default and owned only by explicit transfer.
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

// Scene sibling APIs, traversal, visibility, bounds, clearing, and destruction.
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

// Real renderer coverage: procedural 2D/3D shaders, picking, private GPU sorting, state removal, and cleanup.
{
    const renderer = await Renderer.create(makeCanvas(), { antialias: false, frustumCulling: false, occlusionCulling: true, canvasFormat: "rgba8unorm" });
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

    const hit = await renderer.pick(scene, camera, 96, 96);
    assert.ok(hit, "Expected center pick to hit the volume");
    assert.strictEqual(hit.kind, "latticespace");
    assert.strictEqual(hit.object, volume);
    assert.strictEqual(hit.elementIndex, 0);
    approx(hit.worldPosition[2], 2.4, 0.03, "Expected the outward-wound front voxel face to determine pick depth");

    volume.blendMode = BlendMode.Opaque;
    volume.depthWrite = true;
    volume.cellScale = 1;
    volume.cullMode = CullMode.Front;
    volume.indexRange = { min: [0, 0, 1], max: [1, 1, 3] };
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

    renderer.render(scene, camera);
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(uncapturedError, null, "Occlusion-enabled LatticeSpace frame emitted an uncaptured WebGPU error");
    renderer.destroy();
    scene.destroy();
    localCompute.destroy();
}

compute.destroy();
device.destroy();
