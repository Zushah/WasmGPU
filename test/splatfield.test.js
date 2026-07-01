/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "assert";
import * as WasmGPU from "../dist/WasmGPU.js";
import { create, globals } from "webgpu";

Object.assign(globalThis, globals);
const navigator = { gpu: create([]) };
Object.defineProperty(globalThis, "navigator", { value: navigator, configurable: true });
if (!globalThis.window) globalThis.window = {};
if (typeof globalThis.window.devicePixelRatio !== "number") globalThis.window.devicePixelRatio = 1;

const numberApproxEqual = (a, b, tol = 1e-6, msg = "Numbers differ") => { assert.ok(Number.isFinite(a) && Number.isFinite(b), "Expected finite numbers"); assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`); };

const arraysApproxEqual = (a, b, tol = 1e-6, msg = "Arrays differ") => { assert.strictEqual(a.length, b.length, `${msg}: length ${a.length} vs ${b.length}`); for (let i = 0; i < a.length; i++) numberApproxEqual(a[i], b[i], tol, `${msg} at index ${i}`); };

const srgbChannelToLinear = (value) => { const x = Math.max(0, Math.min(1, value)); if (x <= 0.04045) return x / 12.92; return Math.pow((x + 0.055) / 1.055, 2.4); };

const makeCanvas = (width = 256, height = 256) => {
    const canvas = {
        width,
        height,
        clientWidth: width,
        clientHeight: height,
        style: {},
        currentTextureCount: 0,
        configureCalls: [],
        addEventListener() {},
        removeEventListener() {},
        getBoundingClientRect() {
            return {
                left: 0,
                top: 0,
                width: this.clientWidth,
                height: this.clientHeight,
                right: this.clientWidth,
                bottom: this.clientHeight
            };
        }
    };
    let device = null;
    let format = "rgba8unorm";
    let usage = GPUTextureUsage.RENDER_ATTACHMENT;
    const context = {
        configure(descriptor) {
            device = descriptor.device;
            format = descriptor.format ?? format;
            usage = descriptor.usage ?? usage;
            canvas.configureCalls.push(descriptor);
        },
        unconfigure() {
            device = null;
        },
        getCurrentTexture() {
            assert.ok(device, "GPUCanvasContext.configure() must be called before getCurrentTexture().");
            canvas.currentTextureCount++;
            return device.createTexture({
                size: { width: Math.max(1, canvas.width | 0), height: Math.max(1, canvas.height | 0), depthOrArrayLayers: 1 },
                format,
                usage: usage | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            });
        }
    };
    canvas.getContext = (kind) => kind === "webgpu" ? context : null;
    return canvas;
};

const trackDestroy = (buffer) => {
    let destroyed = 0;
    const originalDestroy = buffer.destroy.bind(buffer);
    buffer.destroy = () => { destroyed++; return originalDestroy(); };
    return () => destroyed;
};

const gpu = navigator.gpu;
assert.ok(gpu, "WebGPU not available. Ensure the dev dependency 'webgpu' is installed.");
await WasmGPU.initWebAssembly(new URL("../dist/", import.meta.url).toString());

const adapter = await gpu.requestAdapter();
assert.ok(adapter, "Failed to acquire a WebGPU adapter");
const device = await adapter.requestDevice();
assert.ok(device, "Failed to acquire a WebGPU device");
device.addEventListener("uncapturederror", (e) => { throw new Error(`Uncaptured WebGPU error: ${e.error ? e.error.message : String(e)}`); });

const { SplatField, WasmGPU: Engine, Compute, Scene, Renderer, PerspectiveCamera, OrthographicCamera, WasmMemoryView } = WasmGPU;

assert.ok(SplatField, "Missing export: SplatField");
assert.ok(Engine, "Missing export: WasmGPU");
assert.strictEqual(typeof Engine.prototype.createSplatField, "function", "Missing API: WasmGPU.createSplatField(descriptor)");
assert.ok(Compute, "Missing export: Compute");
assert.ok(Scene, "Missing export: Scene");
assert.ok(Renderer, "Missing export: Renderer");
assert.ok(WasmMemoryView, "Missing export: WasmMemoryView");

const compute = new Compute(device, device.queue);

const readBufferAsF32 = async (buffer, count, gpuDevice = device, gpuQueue = device.queue) => {
    const localCompute = (gpuDevice === device && gpuQueue === device.queue) ? compute : new Compute(gpuDevice, gpuQueue);
    const out = localCompute.createStorageBuffer({
        label: "splatfield:read:f32",
        byteLength: count * 4,
        copySrc: true
    });
    try {
        localCompute.kernels.copyF32(buffer, { out, count });
        await gpuQueue.onSubmittedWorkDone();
        return await out.readAs(Float32Array);
    } finally {
        out.destroy();
        if (localCompute !== compute) localCompute.destroy();
    }
};

const readBufferAsU32 = async (buffer, count, gpuDevice = device, gpuQueue = device.queue) => {
    const localCompute = (gpuDevice === device && gpuQueue === device.queue) ? compute : new Compute(gpuDevice, gpuQueue);
    const out = localCompute.createStorageBuffer({
        label: "splatfield:read:u32",
        byteLength: count * 4,
        copySrc: true
    });
    try {
        localCompute.kernels.copyU32(buffer, { out, count });
        await gpuQueue.onSubmittedWorkDone();
        return await out.readAs(Uint32Array);
    } finally {
        out.destroy();
        if (localCompute !== compute) localCompute.destroy();
    }
};

const createStorageBuffer = (gpuDevice, byteLength) => { return gpuDevice.createBuffer({ size: byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST }); };

const createPackedStorageBuffer = (gpuDevice, gpuQueue, data) => { const buffer = createStorageBuffer(gpuDevice, data.byteLength); if (data.byteLength > 0) gpuQueue.writeBuffer(buffer, 0, data.buffer, data.byteOffset, data.byteLength); return buffer; };

const makeSequence = (length, start = 0) => { const out = new Float32Array(length); for (let i = 0; i < length; i++) out[i] = start + i; return out; };

const makeSphericalHarmonics = (count) => ({ sh0: makeSequence(count * 3, 0), sh1: makeSequence(count * 9, 100), sh2: makeSequence(count * 15, 200), sh3: makeSequence(count * 21, 300) });

const packExpectedSH = (count, degree, sh) => {
    const floatsPerSplat = [3, 12, 27, 48][degree];
    const out = new Float32Array(count * floatsPerSplat);
    for (let i = 0; i < count; i++) {
        let dst = i * floatsPerSplat;
        out.set(sh.sh0.subarray(i * 3, i * 3 + 3), dst);
        dst += 3;
        if (degree >= 1) { out.set(sh.sh1.subarray(i * 9, i * 9 + 9), dst); dst += 9; }
        if (degree >= 2) { out.set(sh.sh2.subarray(i * 15, i * 15 + 15), dst); dst += 15; }
        if (degree >= 3) out.set(sh.sh3.subarray(i * 21, i * 21 + 21), dst);
    }
    return out;
};

const createExternalSplatBuffers = (gpuDevice, gpuQueue, count, zValues = null) => {
    const centerOpacity = new Float32Array(count * 4);
    const rotation = new Float32Array(count * 4);
    const scale = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
        const base = i * 4;
        centerOpacity[base + 0] = 0;
        centerOpacity[base + 1] = 0;
        centerOpacity[base + 2] = zValues ? (zValues[i] ?? 0) : 0;
        centerOpacity[base + 3] = 1;
        rotation[base + 0] = 0;
        rotation[base + 1] = 0;
        rotation[base + 2] = 0;
        rotation[base + 3] = 1;
        scale[base + 0] = 0.2;
        scale[base + 1] = 0.15;
        scale[base + 2] = 0.1;
        scale[base + 3] = 0;
    }
    return {
        centerOpacityBuffer: createPackedStorageBuffer(gpuDevice, gpuQueue, centerOpacity),
        rotationBuffer: createPackedStorageBuffer(gpuDevice, gpuQueue, rotation),
        scaleBuffer: createPackedStorageBuffer(gpuDevice, gpuQueue, scale)
    };
};

const createExternalSHBuffer = (gpuDevice, gpuQueue, count, degree) => createPackedStorageBuffer(gpuDevice, gpuQueue, makeSequence(count * [3, 12, 27, 48][degree], 1000));

const makePerspectiveCamera = () => {
    const camera = new PerspectiveCamera({ fov: 60, aspect: 1, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 5);
    camera.lookAt(0, 0, 0);
    return camera;
};

const makeOrthographicCamera = () => {
    const camera = new OrthographicCamera({ left: -2, right: 2, top: 2, bottom: -2, near: 0.1, far: 100 });
    camera.transform.setPosition(0, 0, 5);
    camera.lookAt(0, 0, 0);
    return camera;
};

const makeRenderableField = (count = 3, zValues = null) => {
    const positions = new Float32Array(count * 3);
    const rotations = new Float32Array(count * 4);
    const scales = new Float32Array(count * 3);
    const colors = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
        positions[i * 3 + 0] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = zValues ? (zValues[i] ?? 0) : (count === 3 ? (i === 0 ? -2 : i === 1 ? 1 : 0) : (-0.01 * i));
        rotations[i * 4 + 0] = 0;
        rotations[i * 4 + 1] = 0;
        rotations[i * 4 + 2] = 0;
        rotations[i * 4 + 3] = 1;
        scales[i * 3 + 0] = 0.2;
        scales[i * 3 + 1] = 0.15;
        scales[i * 3 + 2] = 0.1;
        colors[i * 4 + 0] = 0.9;
        colors[i * 4 + 1] = 0.4;
        colors[i * 4 + 2] = 0.2;
        colors[i * 4 + 3] = 0.8;
    }
    return new SplatField({ positions, rotations, scales, colors });
};

// Public factory, CPU upload, color handling, and ND indexing work for CPU-authored splatfields.
{
    const canvas = makeCanvas(128, 128);
    const wgpu = await Engine.create(canvas, { antialias: false, frustumCulling: false, canvasFormat: "rgba8unorm" });
    const factoryField = wgpu.createSplatField({
        positions: new Float32Array([0, 0, 0]),
        scales: new Float32Array([0.25, 0.25, 0.25])
    });
    assert.ok(factoryField instanceof SplatField, "Expected WasmGPU.createSplatField() to return a SplatField");
    factoryField.destroy();
    wgpu.destroy();

    const field = new SplatField({
        positions: new Float32Array([1, 2, 3, 4, 5, 6]),
        rotations: new Float32Array([0, 0, 0, 1, 0, 0, 0.70710677, 0.70710677]),
        scales: new Float32Array([2, 3, 4, 1, 1.5, 2]),
        opacities: new Float32Array([0.6, 0.25]),
        colors: new Float32Array([0.5, 0.25, 0.75, 0.8, 0.2, 0.4, 0.6, 0.5]),
        colorSpace: "srgb",
        opacityScale: 0.35,
        ndShape: [1, 2],
        keepCPUData: true
    });

    assert.strictEqual(field.splatCount, 2, "Expected CPU descriptor to infer splatCount");
    assert.deepStrictEqual(field.ndShape, [1, 2], "Expected ndShape to round-trip");
    assert.deepStrictEqual(field.mapLinearIndexToNd(1), [0, 1], "Expected linear index to map into ndShape");
    assert.strictEqual(field.mapLinearIndexToNd(2), null, "Expected out-of-range linear index to return null");

    field.upload(device, device.queue);

    arraysApproxEqual(
        await readBufferAsF32(field.centerOpacityBuffer, 8),
        new Float32Array([1, 2, 3, 0.6, 4, 5, 6, 0.25]),
        0,
        "Packed centerOpacity buffer mismatch"
    );
    arraysApproxEqual(
        await readBufferAsF32(field.rotationBuffer, 8),
        new Float32Array([0, 0, 0, 1, 0, 0, 0.70710677, 0.70710677]),
        1e-6,
        "Packed rotation buffer mismatch"
    );
    arraysApproxEqual(
        await readBufferAsF32(field.scaleBuffer, 8),
        new Float32Array([2, 3, 4, 0, 1, 1.5, 2, 0]),
        0,
        "Packed scale buffer mismatch"
    );
    arraysApproxEqual(
        await readBufferAsF32(field.colorBuffer, 8),
        new Float32Array([
            srgbChannelToLinear(0.5), srgbChannelToLinear(0.25), srgbChannelToLinear(0.75), 0.8,
            srgbChannelToLinear(0.2), srgbChannelToLinear(0.4), srgbChannelToLinear(0.6), 0.5
        ]),
        1e-6,
        "Packed color buffer mismatch"
    );
    numberApproxEqual(field.getUniformData()[0], 0.35, 1e-6, "opacityScale uniform mismatch");
    assert.strictEqual(field.getUniformData()[1], 0, "Expected CPU-authored colors to be stored in linear space");
    assert.strictEqual(field.getUniformData()[2], 0, "Expected direct CPU colors to keep SH mode disabled");

    field.destroy();
}

// Descriptor inference and validation keep CPU-authored colors deterministic and explicit.
{
    const rgbField = new SplatField({
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0, 3, 0, 0]),
        colors: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0.25, 0.5, 0.75])
    });
    const rgbaField = new SplatField({
        positions: new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]),
        colors: new Float32Array([1, 0, 0, 0.25, 0, 1, 0, 0.5, 0, 0, 1, 0.75])
    });

    assert.strictEqual(rgbField.splatCount, 4, "Expected length-12 colors to map to RGB when non-color attributes imply four splats");
    assert.strictEqual(rgbaField.splatCount, 3, "Expected length-12 colors to map to RGBA when non-color attributes imply three splats");

    rgbField.upload(device, device.queue);
    rgbaField.upload(device, device.queue);

    arraysApproxEqual(
        await readBufferAsF32(rgbField.colorBuffer, 16),
        new Float32Array([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0.25, 0.5, 0.75, 1]),
        0,
        "Expected RGB colors to pack with implicit alpha"
    );
    arraysApproxEqual(
        await readBufferAsF32(rgbaField.colorBuffer, 12),
        new Float32Array([1, 0, 0, 0.25, 0, 1, 0, 0.5, 0, 0, 1, 0.75]),
        0,
        "Expected RGBA colors to preserve explicit alpha"
    );

    assert.throws(
        () => new SplatField({ colors: new Float32Array([1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1]) }),
        /ambiguous/,
        "Expected color-only RGB vs RGBA ambiguity to throw"
    );
    assert.throws(
        () => new SplatField({ positions: new Float32Array([0, 0, 0, 1, 0, 0]), scales: new Float32Array([1, 1, 1]) }),
        /scales length does not match splatCount/,
        "Expected mismatched CPU array lengths to throw"
    );
    assert.throws(
        () => new SplatField({ positions: new Float32Array([0, 0, 0, 1, 0, 0]), colors: new Float32Array([1, 0, 0, 0, 1]) }),
        /colors length must equal splatCount \* 3 or splatCount \* 4/,
        "Expected mismatched color lengths to throw"
    );

    rgbField.destroy();
    rgbaField.destroy();
}

// Spherical harmonic descriptors infer degree, reject partial inputs, and expose retained CPU records.
{
    const sh = makeSphericalHarmonics(2);
    const degree0 = new SplatField({ positions: new Float32Array([0, 0, 0, 1, 0, 0]), sh0: sh.sh0 });
    const degree1 = new SplatField({ positions: new Float32Array([0, 0, 0, 1, 0, 0]), sh0: sh.sh0, sh1: sh.sh1 });
    const degree2 = new SplatField({ positions: new Float32Array([0, 0, 0, 1, 0, 0]), sh0: sh.sh0, sh1: sh.sh1, sh2: sh.sh2 });
    const degree3 = new SplatField({
        positions: new Float32Array([1, 2, 3, 4, 5, 6]),
        rotations: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
        scales: new Float32Array([0.2, 0.3, 0.4, 0.5, 0.6, 0.7]),
        opacities: new Float32Array([0.25, 0.75]),
        sh0: sh.sh0, sh1: sh.sh1, sh2: sh.sh2, sh3: sh.sh3, shDegree: 3,
        colorSpace: "srgb",
        keepCPUData: true
    });

    assert.strictEqual(degree0.usesSphericalHarmonics, true, "Expected sh0 to enable spherical harmonic mode");
    assert.strictEqual(degree0.shDegree, 0, "Expected sh0-only fields to infer degree 0");
    assert.strictEqual(degree1.shDegree, 1, "Expected sh0+sh1 fields to infer degree 1");
    assert.strictEqual(degree2.shDegree, 2, "Expected sh0+sh1+sh2 fields to infer degree 2");
    assert.strictEqual(degree3.shDegree, 3, "Expected sh0+sh1+sh2+sh3 fields to infer degree 3");
    assert.strictEqual(degree3.getUniformData()[1], 1, "Expected sRGB SH fields to decode evaluated color in shader");
    assert.strictEqual(degree3.getUniformData()[2], 1, "Expected SH mode uniform flag");
    assert.strictEqual(degree3.getUniformData()[3], 3, "Expected SH degree uniform value");

    degree3.upload(device, device.queue);
    const packed = packExpectedSH(2, 3, sh);
    arraysApproxEqual(await readBufferAsF32(degree3.shBuffer, packed.length), packed, 0, "Packed SH buffer mismatch");
    arraysApproxEqual(await readBufferAsF32(degree3.colorBuffer, 8), new Float32Array([1, 1, 1, 1, 1, 1, 1, 1]), 0, "Expected SH mode to synthesize alpha-only white color data");
    const rec = degree3.getSplatRecord(1);
    assert.ok(rec, "Expected retained SH splat record");
    assert.strictEqual(rec.sphericalHarmonicsDegree, 3, "Expected retained SH degree in splat record");
    arraysApproxEqual(rec.sphericalHarmonics, Array.from(packed.subarray(48, 96)), 0, "Expected retained SH record values");
    degree3.dropCPUData();
    assert.strictEqual(degree3.getSphericalHarmonicsRecord(1), null, "Expected dropCPUData() to remove retained SH records");

    const ownedShDestroyed = trackDestroy(degree3.shBuffer);
    degree3.destroy();
    assert.strictEqual(ownedShDestroyed(), 1, "Expected owned CPU-uploaded shBuffer to be destroyed");

    assert.throws(() => new SplatField({ sh1: sh.sh1 }), /sh0 is required/, "Expected sh1 without sh0 to reject");
    assert.throws(() => new SplatField({ sh0: sh.sh0, sh2: sh.sh2 }), /sh2 requires sh0 and sh1/, "Expected sh2 without sh1 to reject");
    assert.throws(() => new SplatField({ sh0: sh.sh0, sh1: sh.sh1, sh3: sh.sh3 }), /sh3 requires sh0, sh1, and sh2/, "Expected sh3 without sh2 to reject");
    assert.throws(() => new SplatField({ sh0: sh.sh0, sh1: sh.sh1.subarray(0, sh.sh1.length - 1) }), /sh1 length/, "Expected partial degree 1 data to reject");
    assert.throws(() => new SplatField({ sh0: sh.sh0, sh1: sh.sh1, shDegree: 0 }), /shDegree must match/, "Expected inconsistent explicit degree to reject");
    assert.throws(() => new SplatField({ positions: new Float32Array([0, 0, 0]), colors: new Float32Array([1, 1, 1]), sh0: new Float32Array([0, 0, 0]) }), /direct colors and spherical harmonic coefficients cannot be mixed/, "Expected direct colors mixed with SH to reject");

    degree0.destroy();
    degree1.destroy();
    degree2.destroy();
}

// External-buffer splatfields validate packed input sizes, preserve ownership semantics, and safely synthesize missing colors.
{
    assert.throws(
        () => {
            const centerOpacityBuffer = createStorageBuffer(device, 16);
            const rotationBuffer = createStorageBuffer(device, 32);
            const scaleBuffer = createStorageBuffer(device, 32);
            try { new SplatField({ centerOpacityBuffer, rotationBuffer, scaleBuffer, splatCount: 2 }); }
            finally { centerOpacityBuffer.destroy(); rotationBuffer.destroy(); scaleBuffer.destroy(); }
        },
        /centerOpacityBuffer size/, "Expected too-small required packed buffers to throw"
    );
    assert.throws(
        () => {
            const centerOpacityBuffer = createStorageBuffer(device, 32);
            const rotationBuffer = createStorageBuffer(device, 32);
            const scaleBuffer = createStorageBuffer(device, 32);
            const colorBuffer = createStorageBuffer(device, 16);
            try { new SplatField({ centerOpacityBuffer, rotationBuffer, scaleBuffer, colorBuffer, splatCount: 2 }); }
            finally { centerOpacityBuffer.destroy(); rotationBuffer.destroy(); scaleBuffer.destroy(); colorBuffer.destroy(); }
        },
        /colorBuffer size/, "Expected too-small optional colorBuffer to throw"
    );
    assert.throws(
        () => {
            const buffers = createExternalSplatBuffers(device, device.queue, 1);
            const shBuffer = createStorageBuffer(device, 48);
            try { new SplatField({ ...buffers, shBuffer, splatCount: 1 }); }
            finally { buffers.centerOpacityBuffer.destroy(); buffers.rotationBuffer.destroy(); buffers.scaleBuffer.destroy(); shBuffer.destroy(); }
        },
        /shDegree is required/, "Expected external shBuffer to require shDegree"
    );
    assert.throws(
        () => {
            const buffers = createExternalSplatBuffers(device, device.queue, 1);
            const shBuffer = createStorageBuffer(device, 47);
            try { new SplatField({ ...buffers, shBuffer, shDegree: 3, splatCount: 1 }); }
            finally { buffers.centerOpacityBuffer.destroy(); buffers.rotationBuffer.destroy(); buffers.scaleBuffer.destroy(); shBuffer.destroy(); }
        },
        /shBuffer size/, "Expected too-small external shBuffer to throw"
    );

    const borrowedBuffers = createExternalSplatBuffers(device, device.queue, 2);
    const borrowedColor = createPackedStorageBuffer(device, device.queue, new Float32Array([0.25, 0.5, 0.75, 0.8, 0.1, 0.2, 0.3, 0.4]));
    const borrowedCenterDestroyed = trackDestroy(borrowedBuffers.centerOpacityBuffer);
    const borrowedRotationDestroyed = trackDestroy(borrowedBuffers.rotationBuffer);
    const borrowedScaleDestroyed = trackDestroy(borrowedBuffers.scaleBuffer);
    const borrowedColorDestroyed = trackDestroy(borrowedColor);
    const borrowedField = new SplatField({
        centerOpacityBuffer: borrowedBuffers.centerOpacityBuffer,
        rotationBuffer: borrowedBuffers.rotationBuffer,
        scaleBuffer: borrowedBuffers.scaleBuffer,
        colorBuffer: borrowedColor,
        splatCount: 2,
        ownBuffers: false,
        colorSpace: "srgb"
    });

    assert.strictEqual(borrowedField.externalColorBufferSrgb, true, "Expected external sRGB color buffers to decode in the shader");
    assert.strictEqual(borrowedField.getUniformData()[1], 1, "Expected external sRGB color buffers to set the decode flag");
    assert.strictEqual(borrowedField.getUniformData()[2], 0, "Expected direct external colors to keep SH mode disabled");
    arraysApproxEqual(await readBufferAsF32(borrowedField.colorBuffer, 8), new Float32Array([0.25, 0.5, 0.75, 0.8, 0.1, 0.2, 0.3, 0.4]), 0, "Expected supplied external color buffers to remain stored as supplied");
    borrowedField.destroy();
    assert.strictEqual(borrowedCenterDestroyed(), 0, "Expected borrowed centerOpacityBuffer to survive destroy()");
    assert.strictEqual(borrowedRotationDestroyed(), 0, "Expected borrowed rotationBuffer to survive destroy()");
    assert.strictEqual(borrowedScaleDestroyed(), 0, "Expected borrowed scaleBuffer to survive destroy()");
    assert.strictEqual(borrowedColorDestroyed(), 0, "Expected borrowed colorBuffer to survive destroy()");
    borrowedBuffers.centerOpacityBuffer.destroy();
    borrowedBuffers.rotationBuffer.destroy();
    borrowedBuffers.scaleBuffer.destroy();
    borrowedColor.destroy();

    const synthesizedBuffers = createExternalSplatBuffers(device, device.queue, 2);
    const synthesizedCenterDestroyed = trackDestroy(synthesizedBuffers.centerOpacityBuffer);
    const synthesizedRotationDestroyed = trackDestroy(synthesizedBuffers.rotationBuffer);
    const synthesizedScaleDestroyed = trackDestroy(synthesizedBuffers.scaleBuffer);
    const synthesizedField = new SplatField({ centerOpacityBuffer: synthesizedBuffers.centerOpacityBuffer, rotationBuffer: synthesizedBuffers.rotationBuffer, scaleBuffer: synthesizedBuffers.scaleBuffer, splatCount: 2, ownBuffers: false });

    synthesizedField.upload(device, device.queue);
    assert.ok(synthesizedField.colorBuffer, "Expected missing external colors to synthesize a color buffer");
    assert.strictEqual(synthesizedField.colorBuffer.size, 32, "Expected synthesized colors to allocate one vec4 per splat");
    arraysApproxEqual(await readBufferAsF32(synthesizedField.colorBuffer, 8), new Float32Array([1, 1, 1, 1, 1, 1, 1, 1]), 0, "Expected synthesized external colors to be white in linear space");
    const synthesizedColorDestroyed = trackDestroy(synthesizedField.colorBuffer);
    synthesizedField.destroy();
    assert.strictEqual(synthesizedColorDestroyed(), 1, "Expected synthesized colorBuffer to be owned and destroyed by SplatField.destroy()");
    assert.strictEqual(synthesizedCenterDestroyed(), 0, "Expected borrowed centerOpacityBuffer to survive destroy()");
    assert.strictEqual(synthesizedRotationDestroyed(), 0, "Expected borrowed rotationBuffer to survive destroy()");
    assert.strictEqual(synthesizedScaleDestroyed(), 0, "Expected borrowed scaleBuffer to survive destroy()");
    synthesizedBuffers.centerOpacityBuffer.destroy();
    synthesizedBuffers.rotationBuffer.destroy();
    synthesizedBuffers.scaleBuffer.destroy();

    const ownedCenter = createStorageBuffer(device, 16);
    const ownedRotation = createStorageBuffer(device, 16);
    const ownedScale = createStorageBuffer(device, 16);
    const ownedColor = createStorageBuffer(device, 16);
    const ownedCenterDestroyed = trackDestroy(ownedCenter);
    const ownedRotationDestroyed = trackDestroy(ownedRotation);
    const ownedScaleDestroyed = trackDestroy(ownedScale);
    const ownedColorDestroyed = trackDestroy(ownedColor);
    const ownedField = new SplatField({ centerOpacityBuffer: ownedCenter, rotationBuffer: ownedRotation, scaleBuffer: ownedScale, colorBuffer: ownedColor, splatCount: 1, ownBuffers: true });

    ownedField.destroy();
    assert.strictEqual(ownedCenterDestroyed(), 1, "Expected ownBuffers centerOpacityBuffer to be destroyed");
    assert.strictEqual(ownedRotationDestroyed(), 1, "Expected ownBuffers rotationBuffer to be destroyed");
    assert.strictEqual(ownedScaleDestroyed(), 1, "Expected ownBuffers scaleBuffer to be destroyed");
    assert.strictEqual(ownedColorDestroyed(), 1, "Expected ownBuffers colorBuffer to be destroyed");

    const borrowedShBuffers = createExternalSplatBuffers(device, device.queue, 2);
    const borrowedSh = createExternalSHBuffer(device, device.queue, 2, 3);
    const borrowedShDestroyed = trackDestroy(borrowedSh);
    const borrowedShField = new SplatField({ ...borrowedShBuffers, shBuffer: borrowedSh, shDegree: 3, splatCount: 2, colorSpace: "srgb" });
    assert.strictEqual(borrowedShField.usesSphericalHarmonics, true, "Expected external shBuffer to enable SH mode");
    assert.strictEqual(borrowedShField.shDegree, 3, "Expected external shBuffer degree to round-trip");
    assert.strictEqual(borrowedShField.getUniformData()[1], 1, "Expected sRGB external SH fields to decode evaluated color in shader");
    assert.strictEqual(borrowedShField.getUniformData()[2], 1, "Expected external SH uniform mode flag");
    assert.strictEqual(borrowedShField.getUniformData()[3], 3, "Expected external SH uniform degree");
    borrowedShField.upload(device, device.queue);
    assert.ok(borrowedShField.colorBuffer, "Expected external SH mode to synthesize a color buffer for alpha");
    borrowedShField.destroy();
    assert.strictEqual(borrowedShDestroyed(), 0, "Expected borrowed shBuffer to survive destroy()");
    borrowedShBuffers.centerOpacityBuffer.destroy();
    borrowedShBuffers.rotationBuffer.destroy();
    borrowedShBuffers.scaleBuffer.destroy();
    borrowedSh.destroy();

    const ownedShBuffers = createExternalSplatBuffers(device, device.queue, 1);
    const ownedSh = createExternalSHBuffer(device, device.queue, 1, 0);
    const ownedShDestroyed = trackDestroy(ownedSh);
    const ownedShField = new SplatField({ ...ownedShBuffers, shBuffer: ownedSh, shDegree: 0, splatCount: 1, ownBuffers: true });
    ownedShField.destroy();
    assert.strictEqual(ownedShDestroyed(), 1, "Expected ownBuffers shBuffer to be destroyed");
}

// External WebAssembly memory views: strict packed source family, explicit refresh, SH/direct-color exclusivity, CPU snapshots, validation, and grow-only capacity.
{
    const makeView = (length, dtype = "f32", name = "splatfield-wasm-view", capacity = 128) => {
        const memory = new WebAssembly.Memory({ initial: 1 });
        const lengthGlobal = new WebAssembly.Global({ value: "i32", mutable: true }, length);
        const moduleRef = WasmGPU.webassemblyInterop.fromMemory(memory, { name });
        const data = dtype === "u32" ? new Uint32Array(memory.buffer, 0, capacity) : new Float32Array(memory.buffer, 0, capacity);
        const view = moduleRef.view({ ptr: 0, length: { global: lengthGlobal }, dtype, name });
        assert.ok(view instanceof WasmMemoryView, "Expected fromMemory().view() to return a WasmMemoryView");
        return { memory, moduleRef, lengthGlobal, data, view };
    };
    const fillCore = (prefix, count = 2, activeFloats = count * 4) => {
        const centerOpacity = makeView(activeFloats, "f32", `${prefix}:centerOpacity`);
        const rotation = makeView(activeFloats, "f32", `${prefix}:rotation`);
        const scale = makeView(activeFloats, "f32", `${prefix}:scale`);
        for (let i = 0; i < count; i++) {
            const base = i * 4;
            centerOpacity.data.set([i + 1, i + 2, i + 3, 0.5 + i * 0.1], base);
            rotation.data.set([0, 0, 0, 1], base);
            scale.data.set([0.1 + i, 0.2 + i, 0.3 + i, 0], base);
        }
        return { centerOpacity, rotation, scale };
    };

    const directCore = fillCore("sf:wasm:direct");
    const directColor = makeView(8, "f32", "sf:wasm:direct:color");
    directColor.data.set([0.25, 0.5, 0.75, 0.8, 0.1, 0.2, 0.3, 0.4]);
    const directField = new SplatField({
        wasmCenterOpacity: directCore.centerOpacity.view,
        wasmRotation: directCore.rotation.view,
        wasmScale: directCore.scale.view,
        wasmColor: directColor.view,
        colorSpace: "srgb"
    });
    assert.strictEqual(directField.splatCount, 2, "Expected wasmCenterOpacity to derive splatCount");
    assert.strictEqual(directField.getSplatRecord(0), null, "Default wasm path should not retain CPU splat records");
    assert.deepStrictEqual([directField.getLocalBounds().empty, directField.getLocalBounds().partial], [true, true], "Default external-wasm SplatField bounds should stay partial until recomputed");
    directField.upload(device, device.queue);
    arraysApproxEqual(await readBufferAsF32(directField.centerOpacityBuffer, 8), directCore.centerOpacity.data.subarray(0, 8), 0, "wasmCenterOpacity upload mismatch");
    arraysApproxEqual(await readBufferAsF32(directField.rotationBuffer, 8), directCore.rotation.data.subarray(0, 8), 0, "wasmRotation upload mismatch");
    arraysApproxEqual(await readBufferAsF32(directField.scaleBuffer, 8), directCore.scale.data.subarray(0, 8), 0, "wasmScale upload mismatch");
    arraysApproxEqual(await readBufferAsF32(directField.colorBuffer, 8), directColor.data.subarray(0, 8), 0, "wasmColor upload mismatch");
    assert.strictEqual(directField.getUniformData()[1], 1, "Expected wasm sRGB color data to decode in the shader");
    assert.strictEqual(directField.getUniformData()[2], 0, "Expected wasm direct color to keep SH mode disabled");
    directField.bindGroupKey = "sf:stable-wasm";
    directCore.centerOpacity.data[0] = 9;
    directField.refreshWasmCenterOpacity();
    directField.upload(device, device.queue);
    assert.strictEqual(directField.bindGroupKey, "sf:stable-wasm", "same-buffer wasm uploads should not invalidate a reused bind group");
    arraysApproxEqual(await readBufferAsF32(directField.centerOpacityBuffer, 8), directCore.centerOpacity.data.subarray(0, 8), 0, "refreshed wasmCenterOpacity upload mismatch");
    directField.refreshFromWasm({ recomputeBounds: true });
    assert.strictEqual(directField.getLocalBounds().empty, false, "recomputeBounds should compute SplatField bounds from external wasm sources");
    directCore.centerOpacity.data.set([-10, -11, -12, 0.8], 0);
    directField.refreshFromWasm({ recomputeBounds: true });
    assert.ok(directField.getLocalBounds().boxMin[0] < -10, "Repeated recomputeBounds should refresh active SplatField wasm bounds");
    directField.setWasmColor(null);
    directField.upload(device, device.queue);
    assert.strictEqual(directField.getUniformData()[1], 0, "Clearing wasmColor should clear external sRGB decode state");
    arraysApproxEqual(await readBufferAsF32(directField.colorBuffer, 8), new Float32Array([1, 1, 1, 1, 1, 1, 1, 1]), 0, "Clearing wasmColor should schedule fallback white colors");
    directField.destroy();

    const explicitCore = fillCore("sf:wasm:explicit");
    const explicitField = new SplatField({ wasmCenterOpacity: explicitCore.centerOpacity.view, wasmRotation: explicitCore.rotation.view, wasmScale: explicitCore.scale.view, boundsMin: [-1, -2, -3], boundsMax: [1, 2, 3] });
    explicitField.refreshFromWasm({ recomputeBounds: true });
    arraysApproxEqual(explicitField.boundsMin, [-1, -2, -3], 1e-6, "Explicit SplatField bounds should not be overwritten by wasm recomputeBounds");
    explicitField.destroy();

    const cpuGuard = new SplatField({ positions: new Float32Array([1, 2, 3]), scales: new Float32Array([0.5, 0.5, 0.5]), colors: new Float32Array([0.2, 0.3, 0.4]), keepCPUData: true });
    assert.throws(() => cpuGuard.setWasmCenterOpacity(directCore.centerOpacity.view), /setWasmPackedData\(\).*initial wasm source-family replacement/i, "Single wasm core setters should not destructively start wasm conversion");
    assert.deepStrictEqual(cpuGuard.getSplatRecord(0).position, [1, 2, 3], "Rejected single-channel wasm conversion should preserve CPU data");
    cpuGuard.destroy();

    const shCore = fillCore("sf:wasm:sh");
    const sh = makeView(24, "f32", "sf:wasm:sh:coefficients");
    sh.data.set(makeSequence(24, 10));
    const shField = new SplatField({
        wasmCenterOpacity: shCore.centerOpacity.view,
        wasmRotation: shCore.rotation.view,
        wasmScale: shCore.scale.view,
        wasmSphericalHarmonics: sh.view,
        shDegree: 1,
        colorSpace: "srgb",
        keepCPUData: true
    });
    assert.strictEqual(shField.usesSphericalHarmonics, true, "Expected wasmSphericalHarmonics to enable SH mode");
    assert.strictEqual(shField.shDegree, 1, "Expected wasm SH degree to round-trip");
    assert.strictEqual(shField.getUniformData()[1], 1, "Expected sRGB wasm SH fields to decode evaluated color in shader");
    const shRecord = shField.getSplatRecord(1);
    assert.ok(shRecord, "keepCPUData should snapshot wasm splat records");
    arraysApproxEqual(shRecord.sphericalHarmonics, Array.from(sh.data.subarray(12, 24)), 0, "Expected retained wasm SH record values");
    shCore.centerOpacity.data.set([40, 41, 42, 0.9], 4);
    assert.deepStrictEqual(shField.getSplatRecord(1).position, [2, 3, 4], "Wasm CPU records should be retained as copies");
    shField.refreshFromWasm({ keepCPUData: true });
    assert.deepStrictEqual(shField.getSplatRecord(1).position, [40, 41, 42], "refreshFromWasm() should refresh retained wasm CPU records");
    shField.upload(device, device.queue);
    arraysApproxEqual(await readBufferAsF32(shField.shBuffer, 24), sh.data.subarray(0, 24), 0, "wasmSphericalHarmonics upload mismatch");
    arraysApproxEqual(await readBufferAsF32(shField.colorBuffer, 8), new Float32Array([1, 1, 1, 1, 1, 1, 1, 1]), 0, "Expected wasm SH mode to synthesize white color data");
    shField.setWasmSphericalHarmonics(null);
    shField.upload(device, device.queue);
    assert.strictEqual(shField.usesSphericalHarmonics, false, "Clearing wasmSphericalHarmonics should clear SH mode");
    assert.strictEqual(shField.shBuffer, null, "Clearing wasmSphericalHarmonics should clear the managed SH buffer");
    arraysApproxEqual(await readBufferAsF32(shField.colorBuffer, 8), new Float32Array([1, 1, 1, 1, 1, 1, 1, 1]), 0, "Clearing wasmSphericalHarmonics should preserve fallback white colors");
    shField.destroy();

    const capacityCore = fillCore("sf:wasm:capacity", 5, 20);
    const capacityColor = makeView(20, "f32", "sf:wasm:capacity:color");
    capacityColor.data.set(makeSequence(20, 0.1));
    const capacityField = new SplatField({
        wasmCenterOpacity: capacityCore.centerOpacity.view,
        wasmRotation: capacityCore.rotation.view,
        wasmScale: capacityCore.scale.view,
        wasmColor: capacityColor.view,
        splatCount: 2,
        wasmCapacity: 4
    });
    capacityField.upload(device, device.queue);
    const firstCenterOpacityBuffer = capacityField.centerOpacityBuffer;
    assert.ok(firstCenterOpacityBuffer, "Expected wasmCenterOpacity upload to allocate a buffer");
    assert.ok(firstCenterOpacityBuffer.size >= 4 * 16, "wasmCapacity should be measured in splat records");
    capacityField.bindGroupKey = "sf:stable-capacity";
    capacityField.refreshFromWasm({ splatCount: 3 });
    capacityField.upload(device, device.queue);
    assert.strictEqual(capacityField.centerOpacityBuffer, firstCenterOpacityBuffer, "Expected wasm capacity to be reused when active count fits");
    assert.strictEqual(capacityField.bindGroupKey, "sf:stable-capacity", "Reused wasm capacity should not invalidate the bind group");
    capacityField.refreshFromWasm({ splatCount: 5 });
    capacityField.upload(device, device.queue);
    assert.notStrictEqual(capacityField.centerOpacityBuffer, firstCenterOpacityBuffer, "Expected wasm capacity to grow when active count exceeds capacity");
    assert.strictEqual(capacityField.bindGroupKey, null, "Growing wasm capacity should invalidate the bind group");
    capacityField.destroy();

    const shrinkCore = fillCore("sf:wasm:shrink");
    const shrinkField = new SplatField({ wasmCenterOpacity: shrinkCore.centerOpacity.view, wasmRotation: shrinkCore.rotation.view, wasmScale: shrinkCore.scale.view, splatCount: 2 });
    shrinkField.upload(device, device.queue);
    shrinkField.refreshWasmCenterOpacity({ splatCount: 2 });
    shrinkCore.centerOpacity.lengthGlobal.value = 4;
    assert.throws(() => shrinkField.upload(device, device.queue), /wasmCenterOpacity length must be at least splatCount\*4/i, "upload() should validate refreshed wasmCenterOpacity length before reading");
    shrinkField.destroy();

    const mixColorBuffer = createStorageBuffer(device, 16);
    try {
        const invalidCore = fillCore("sf:wasm:invalid");
        const invalidColor = makeView(4, "f32", "sf:wasm:invalid:color");
        const invalidSH = makeView(12, "f32", "sf:wasm:invalid:sh");
        const invalidCases = [
            { message: "CPU and external-wasm descriptors should not mix", error: /CPU-array, external-buffer, and external-WebAssembly descriptors cannot be mixed/i, create: () => new SplatField({ positions: new Float32Array([0, 0, 0]), wasmCenterOpacity: invalidCore.centerOpacity.view }) },
            { message: "wasmColor should not mix with CPU SH arrays", error: /direct colors and spherical harmonic coefficients cannot be mixed/i, create: () => new SplatField({ wasmColor: invalidColor.view, sh0: new Float32Array([0, 0, 0]) }) },
            { message: "wasmSphericalHarmonics should not mix with external color buffers", error: /direct colors and spherical harmonic coefficients cannot be mixed/i, create: () => new SplatField({ wasmSphericalHarmonics: invalidSH.view, shDegree: 1, colorBuffer: mixColorBuffer, splatCount: 1 }) },
            { message: "wasmSphericalHarmonics should require shDegree", error: /shDegree is required when using wasmSphericalHarmonics/i, create: () => new SplatField({ ...invalidCore, wasmSphericalHarmonics: invalidSH.view }) },
            { message: "Invalid derived wasmCenterOpacity splatCount should throw", error: /wasmCenterOpacity length must be a multiple of 4/i, create: () => new SplatField({ wasmCenterOpacity: makeView(5, "f32", "sf:wasm:bad:center").view, wasmRotation: invalidCore.rotation.view, wasmScale: invalidCore.scale.view }) },
            { message: "Short wasmColor should throw", error: /wasmColor length must be at least splatCount\*4/i, create: () => new SplatField({ wasmCenterOpacity: invalidCore.centerOpacity.view, wasmRotation: invalidCore.rotation.view, wasmScale: invalidCore.scale.view, wasmColor: invalidColor.view, splatCount: 2 }) },
            { message: "Non-WasmMemoryView wasmCenterOpacity should throw", error: /wasmCenterOpacity must be a WasmMemoryView/i, create: () => new SplatField({ wasmCenterOpacity: invalidCore.centerOpacity.data, wasmRotation: invalidCore.rotation.view, wasmScale: invalidCore.scale.view }) },
            { message: "Non-f32 wasmCenterOpacity should throw", error: /wasmCenterOpacity dtype must be 'f32'/i, create: () => new SplatField({ wasmCenterOpacity: makeView(8, "u32", "sf:wasm:bad:dtype").view, wasmRotation: invalidCore.rotation.view, wasmScale: invalidCore.scale.view }) }
        ];
        for (const testCase of invalidCases) assert.throws(testCase.create, testCase.error, testCase.message);
    } finally { mixColorBuffer.destroy(); }
}

// Bounds and scene APIs expose splatfields as first-class scene objects with explicit and computed spatial state.
{
    const explicitField = new SplatField({
        positions: new Float32Array([0, 0, 0]),
        boundsMin: [-1, -2, -3],
        boundsMax: [4, 5, 6],
        boundsCenter: [9, 8, 7],
        boundsRadius: 11
    });
    const computedField = new SplatField({
        positions: new Float32Array([1, 2, 3, -4, 0, 5]),
        scales: new Float32Array([0.5, 1, 2, 1, 1, 1]),
        keepCPUData: true
    });

    const explicitBounds = explicitField.getLocalBounds();
    assert.deepStrictEqual(explicitBounds.boxMin, [-1, -2, -3], "Explicit bounds min mismatch");
    assert.deepStrictEqual(explicitBounds.boxMax, [4, 5, 6], "Explicit bounds max mismatch");
    assert.deepStrictEqual(explicitBounds.sphereCenter, [9, 8, 7], "Explicit bounds center mismatch");
    numberApproxEqual(explicitBounds.sphereRadius, 11, 1e-6, "Explicit bounds radius mismatch");

    explicitField.transform.setPosition(2, 0, 0);
    const explicitWorldBounds = explicitField.getWorldBounds();
    assert.deepStrictEqual(explicitWorldBounds.sphereCenter, [11, 8, 7], "Expected world bounds to transform the stored sphere center");
    numberApproxEqual(explicitWorldBounds.sphereRadius, 11, 1e-6, "Expected world bounds to preserve the stored sphere radius");

    const computedBounds = computedField.getLocalBounds();
    arraysApproxEqual(computedBounds.boxMin, [-7, -4, -3], 1e-6, "Computed bounds min mismatch");
    arraysApproxEqual(computedBounds.boxMax, [7, 8, 9], 1e-6, "Computed bounds max mismatch");

    explicitField.destroy();
    computedField.destroy();

    const scene = new Scene();
    const visibleField = new SplatField({ name: "visible", positions: new Float32Array([0, 0, 0]), scales: new Float32Array([1, 1, 1]) });
    const hiddenField = new SplatField({ name: "hidden", positions: new Float32Array([10, 0, 0]), scales: new Float32Array([1, 1, 1]) });
    hiddenField.visible = false;

    scene.add(visibleField).add(hiddenField);

    assert.strictEqual(scene.splatFields.length, 2, "Scene.splatFields length mismatch");
    assert.strictEqual(scene.visibleSplatFields.length, 1, "Scene.visibleSplatFields length mismatch");
    assert.strictEqual(scene.findSplatFieldByName("visible"), visibleField, "Scene.findSplatFieldByName mismatch");
    assert.strictEqual(scene.findAllSplatFieldsByName("hidden").length, 1, "Scene.findAllSplatFieldsByName mismatch");

    let traversed = 0;
    let traversedVisible = 0;
    scene.traverseSplatFields(() => { traversed++; });
    scene.traverseVisibleSplatFields(() => { traversedVisible++; });
    assert.strictEqual(traversed, 2, "Scene.traverseSplatFields mismatch");
    assert.strictEqual(traversedVisible, 1, "Scene.traverseVisibleSplatFields mismatch");

    const visibleBounds = scene.getBounds({ visibleOnly: true });
    const allBounds = scene.getBounds({ visibleOnly: false });
    assert.ok(visibleBounds.boxMax[0] < 10, "Scene visible bounds should exclude hidden splatfields");
    assert.ok(allBounds.boxMax[0] >= 13, "Scene full bounds should include hidden splatfields");

    scene.remove(hiddenField);
    assert.strictEqual(scene.splatFields.length, 1, "Scene.remove(splatField) mismatch");
    scene.clearSplatFields();
    assert.strictEqual(scene.splatFields.length, 0, "Scene.clearSplatFields() mismatch");

    scene.add(visibleField).add(hiddenField);
    scene.destroy();
    assert.strictEqual(scene.splatFields.length, 0, "Scene.destroy() should clear splatfields");
}

// Renderer renders, depth-sorts, and cleans up splatfield state across normal and mixed-size frames.
{
    const canvas = makeCanvas(192, 192);
    const renderer = await Renderer.create(canvas, { antialias: false, frustumCulling: false, canvasFormat: "rgba8unorm" });
    const rendererAny = renderer;
    const scene = new Scene();
    const perspectiveCamera = makePerspectiveCamera();
    let uncapturedError = null;
    rendererAny.device.addEventListener("uncapturederror", (e) => { uncapturedError = e?.error?.message ?? String(e); });

    const sortedField = makeRenderableField(3);
    scene.add(sortedField);
    uncapturedError = null;
    assert.doesNotThrow(() => renderer.render(scene, perspectiveCamera));
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(uncapturedError, null, "Renderer emitted an uncaptured WebGPU error");
    const sortedState = rendererAny.splatFieldSortStates.get(sortedField);
    assert.ok(sortedState, "Expected renderer to create per-field splat sort state");
    assert.ok(rendererAny.splatSortCapacity >= sortedField.splatCount, "Expected shared sort scratch to cover the field count");
    assert.deepStrictEqual(Array.from(await readBufferAsU32(sortedState.sortedIndexBuffer, 3, rendererAny.device, rendererAny.queue)), [0, 2, 1], "Expected splats to be GPU-sorted back to front");

    uncapturedError = null;
    assert.doesNotThrow(() => renderer.render(scene, makeOrthographicCamera()));
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(uncapturedError, null, "Orthographic splat rendering should not emit an uncaptured WebGPU error");

    const sortedIndexDestroyed = trackDestroy(sortedState.sortedIndexBuffer);
    const transformDestroyed = trackDestroy(sortedState.transformBuffer);
    scene.remove(sortedField);
    renderer.render(scene, perspectiveCamera);
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(rendererAny.splatFieldSortStates.has(sortedField), false, "Expected renderer to discard sort state after a field leaves the scene");
    assert.strictEqual(sortedIndexDestroyed(), 1, "Expected removed-field sortedIndexBuffer to be destroyed");
    assert.strictEqual(transformDestroyed(), 1, "Expected removed-field transformBuffer to be destroyed");
    sortedField.destroy();

    const shRender = makeSphericalHarmonics(1);
    const shRenderField = new SplatField({
        positions: new Float32Array([0, 0, -1]),
        rotations: new Float32Array([0, 0, 0, 1]),
        scales: new Float32Array([0.25, 0.2, 0.15]),
        opacities: new Float32Array([0.9]),
        sh0: shRender.sh0, sh1: shRender.sh1, sh2: shRender.sh2, sh3: shRender.sh3, shDegree: 3
    });
    scene.add(shRenderField);
    uncapturedError = null;
    assert.doesNotThrow(() => renderer.render(scene, perspectiveCamera));
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(uncapturedError, null, "Expected degree-3 SH splatfield perspective rendering to avoid uncaptured WebGPU errors");
    uncapturedError = null;
    assert.doesNotThrow(() => renderer.render(scene, makeOrthographicCamera()));
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(uncapturedError, null, "Expected degree-3 SH splatfield orthographic rendering to avoid uncaptured WebGPU errors");
    scene.clearSplatFields();
    shRenderField.destroy();

    const anisotropicPerspectiveField = new SplatField({
        positions: new Float32Array([0, 0, -1]),
        rotations: new Float32Array([0, 0.5646425, 0, 0.8253356]),
        scales: new Float32Array([1.5, 0.03, 0.03]),
        colors: new Float32Array([0.7, 0.8, 0.9, 0.9])
    });
    scene.add(anisotropicPerspectiveField);
    uncapturedError = null;
    assert.doesNotThrow(() => renderer.render(scene, perspectiveCamera));
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(uncapturedError, null, "Expected anisotropic perspective splat projection to render without uncaptured WebGPU errors");
    scene.clearSplatFields();
    anisotropicPerspectiveField.destroy();

    const nearPlaneField = new SplatField({
        positions: new Float32Array([0, 0, 4.89]),
        scales: new Float32Array([0.08, 0.04, 0.02]),
        colors: new Float32Array([0.6, 0.7, 0.9, 0.85])
    });
    scene.add(nearPlaneField);
    uncapturedError = null;
    assert.doesNotThrow(() => renderer.render(scene, perspectiveCamera));
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(uncapturedError, null, "Expected near-plane splat projection to render without uncaptured WebGPU errors");
    scene.clearSplatFields();
    nearPlaneField.destroy();

    const smallField = makeRenderableField(3);
    const largeField = makeRenderableField(300);
    smallField.transform.setPosition(0, 0, -6);
    largeField.transform.setPosition(0, 0, 0);
    scene.add(smallField).add(largeField);
    uncapturedError = null;
    assert.doesNotThrow(() => renderer.render(scene, perspectiveCamera));
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(uncapturedError, null, "Expected mixed-size same-frame splat sorting to avoid shared scratch lifetime errors");
    assert.ok(rendererAny.splatSortCapacity >= 300, "Expected shared sort scratch to be preallocated for the largest same-frame splatfield");
    assert.ok(rendererAny.splatFieldSortStates.has(smallField), "Expected same-frame small-field sort state to exist");
    assert.ok(rendererAny.splatFieldSortStates.has(largeField), "Expected same-frame large-field sort state to exist");
    scene.clearSplatFields();
    smallField.destroy();
    largeField.destroy();

    const externalBuffers = createExternalSplatBuffers(rendererAny.device, rendererAny.queue, 2, [-1, 0]);
    const externalField = new SplatField({
        centerOpacityBuffer: externalBuffers.centerOpacityBuffer,
        rotationBuffer: externalBuffers.rotationBuffer,
        scaleBuffer: externalBuffers.scaleBuffer,
        splatCount: 2
    });
    scene.add(externalField);
    uncapturedError = null;
    assert.doesNotThrow(() => renderer.render(scene, perspectiveCamera));
    await rendererAny.queue.onSubmittedWorkDone();
    assert.strictEqual(uncapturedError, null, "Expected external splatfields without colors to render without uncaptured WebGPU errors");
    assert.ok(externalField.colorBuffer, "Expected renderer upload path to synthesize missing external colors");
    scene.clearSplatFields();
    externalField.destroy();
    externalBuffers.centerOpacityBuffer.destroy();
    externalBuffers.rotationBuffer.destroy();
    externalBuffers.scaleBuffer.destroy();

    const remainingField = makeRenderableField(3);
    scene.add(remainingField);
    renderer.render(scene, perspectiveCamera);
    await rendererAny.queue.onSubmittedWorkDone();
    const remainingState = rendererAny.splatFieldSortStates.get(remainingField);
    assert.ok(remainingState, "Expected sort state to exist before renderer destruction");
    const remainingSortedIndexDestroyed = trackDestroy(remainingState.sortedIndexBuffer);
    const remainingTransformDestroyed = trackDestroy(remainingState.transformBuffer);
    renderer.destroy();
    assert.strictEqual(remainingSortedIndexDestroyed(), 1, "Expected Renderer.destroy() to destroy remaining sortedIndexBuffer resources");
    assert.strictEqual(remainingTransformDestroyed(), 1, "Expected Renderer.destroy() to destroy remaining transformBuffer resources");
    scene.destroy();

    const canvasAA = makeCanvas(192, 192);
    const rendererAA = await Renderer.create(canvasAA, { antialias: true, frustumCulling: false, canvasFormat: "rgba8unorm" });
    const rendererAAAny = rendererAA;
    const sceneAA = new Scene();
    sceneAA.add(makeRenderableField(3));
    assert.doesNotThrow(() => rendererAA.render(sceneAA, makePerspectiveCamera()));
    await rendererAAAny.queue.onSubmittedWorkDone();
    rendererAA.destroy();
    sceneAA.destroy();
}

compute.destroy();
device.destroy();
