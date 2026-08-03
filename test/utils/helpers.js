/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./assert.js";
import { requestTestDevice } from "./webgpu.js";

export { createTestRandom } from "./random.js";
export { destroyTestDevice } from "./webgpu.js";

export const createApproxHelpers = (defaultTolerance = 1e-6) => {
    const numberApproxEqual = (actual, expected, tolerance = defaultTolerance, message = "Numbers differ") => {
        assert.ok(Number.isFinite(actual) && Number.isFinite(expected), `${message}: expected finite numbers (${actual}, ${expected})`);
        assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
    };
    const arraysApproxEqual = (actual, expected, tolerance = defaultTolerance, message = "Arrays differ") => {
        assert.strictEqual(actual.length, expected.length, `${message}: length ${actual.length} vs ${expected.length}`);
        for (let i = 0; i < actual.length; i++) numberApproxEqual(actual[i], expected[i], tolerance, `${message} at index ${i}`);
    };
    return { arraysApproxEqual, numberApproxEqual };
};

export const arraysEqualU32 = (actual, expected, message = "Arrays differ") => {
    assert.strictEqual(actual.length, expected.length, `${message}: length ${actual.length} vs ${expected.length}`);
    for (let i = 0; i < actual.length; i++) assert.strictEqual(actual[i] >>> 0, expected[i] >>> 0, `${message} at index ${i}: ${actual[i]} vs ${expected[i]}`);
};

export const createBrowserCanvasScope = () => {
    const canvases = new Set();
    return {
        createCanvas(width = 640, height = 480) {
            assert.ok(globalThis.document?.body, "Real browser canvas tests require document.body.");
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.style.display = "block";
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            document.body.appendChild(canvas);
            canvases.add(canvas);
            return canvas;
        },
        restore() {
            for (const canvas of canvases) canvas.remove();
            canvases.clear();
        }
    };
};

export const createWebGPUCanvasDouble = (width = 640, height = 480, { additionalUsage = GPUTextureUsage.TEXTURE_BINDING } = {}) => {
    const canvas = {
        width,
        height,
        clientWidth: width,
        clientHeight: height,
        style: {},
        configureCalls: [],
        currentTextureCount: 0,
        addEventListener() {},
        removeEventListener() {},
        getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight, right: this.clientWidth, bottom: this.clientHeight }; }
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
                usage: usage | GPUTextureUsage.RENDER_ATTACHMENT | additionalUsage
            });
        }
    };
    canvas.getContext = (kind) => kind === "webgpu" ? context : null;
    return canvas;
};

export const initializeTestWebAssembly = (initWebAssembly) => initWebAssembly(new URL("../../dist/", import.meta.url).toString());

export const setupTest = async ({ initWebAssembly, webgpu = false } = {}) => {
    if (initWebAssembly) await initializeTestWebAssembly(initWebAssembly);
    return webgpu ? requestTestDevice(webgpu === true ? undefined : webgpu) : {};
};

export const makeSequence = (length, start = 0) => {
    const output = new Float32Array(length);
    for (let i = 0; i < length; i++) output[i] = start + i;
    return output;
};

export const safelySilence = (method, run) => {
    assert.ok(["debug", "info", "log", "warn"].includes(method), `Unsupported console method: ${method}`);
    assert.strictEqual(typeof run, "function", "safelySilence() requires a function");
    const messages = [];
    const original = console[method];
    const restore = () => { console[method] = original; };
    console[method] = (...args) => { messages.push(args.map(String).join(" ")); };
    try {
        const result = run();
        if (result && typeof result.then === "function") return Promise.resolve(result).then((value) => ({ result: value, messages })).finally(restore);
        restore();
        return { result, messages };
    } catch (error) {
        restore();
        throw error;
    }
};

const readBuffer = async (compute, buffer, count, TypedArray, copy) => {
    const output = compute.createStorageBuffer({ byteLength: count * TypedArray.BYTES_PER_ELEMENT, copySrc: true });
    try {
        copy(buffer, { out: output, count });
        await compute.queue.onSubmittedWorkDone();
        return await output.readAs(TypedArray);
    } finally {
        output.destroy();
    }
};

export const readBufferAsF32 = (compute, buffer, count) => readBuffer(compute, buffer, count, Float32Array, compute.kernels.copyF32.bind(compute.kernels));

export const readBufferAsU32 = (compute, buffer, count) => readBuffer(compute, buffer, count, Uint32Array, compute.kernels.copyU32.bind(compute.kernels));

export const createBufferReaders = (compute) => ({
    readBufferAsF32: (buffer, count) => readBufferAsF32(compute, buffer, count),
    readBufferAsU32: (buffer, count) => readBufferAsU32(compute, buffer, count)
});

export const trackDestroy = (resource) => {
    let count = 0;
    const destroy = resource.destroy.bind(resource);
    resource.destroy = () => {
        count++;
        return destroy();
    };
    return () => count;
};
