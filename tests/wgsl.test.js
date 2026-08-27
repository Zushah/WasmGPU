/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { destroyTestDevice, setupTest } from "./utils/helpers.js";
import { WasmGPU, webgpuInterop } from "../release/WasmGPU.js";

const extractBundledShaders = (bundle) => {
    const markerPattern = /^\/\/ (wgsl\/[^\r\n]+\.wgsl)\r?$/gm;
    const shaderPattern = /^\/\/ (wgsl\/[^\r\n]+\.wgsl)\r?\nvar [A-Za-z_$][\w$]* = ("(?:[^"\\]|\\.)*");\r?$/gm;
    const markerPaths = Array.from(bundle.matchAll(markerPattern), (match) => match[1]);
    const shaders = Array.from(bundle.matchAll(shaderPattern), (match) => ({ path: match[1], code: JSON.parse(match[2]) }));
    assert.ok(markerPaths.length > 0, "No bundled WGSL modules found in ./release/WasmGPU.js");
    assert.equal(shaders.length, markerPaths.length, `Expected to extract ${markerPaths.length} bundled WGSL modules, extracted ${shaders.length}`);
    assert.deepEqual(shaders.map((shader) => shader.path), markerPaths, "Bundled WGSL extraction must preserve every esbuild shader section");
    assert.equal(new Set(markerPaths).size, markerPaths.length, "Bundled WGSL module paths must be unique");
    return shaders;
};

const formatDiagnostic = (path, message) => { const location = message.lineNum > 0 ? `:${message.lineNum}:${message.linePos}` : ""; return `${path}${location}: ${message.message}`; };

const bundleResponse = await fetch(new URL("../release/WasmGPU.js", import.meta.url));
assert.ok(bundleResponse.ok, `Failed to fetch ./release/WasmGPU.js: ${bundleResponse.status}`);
const bundle = await bundleResponse.text();
const shaders = extractBundledShaders(bundle);
const requirements = ["primitive-index"];
const { adapter, device } = await setupTest({ webgpu: { optionalFeatures: requirements } });
const primitiveIndexSupported = adapter.features.has(requirements[0]);

const errors = [];
const warnings = [];
const skipped = [];

// 1) Every bundled WGSL module compiles without validation errors on supported browser features.
{
    for (const shader of shaders) {
        if (!primitiveIndexSupported && /\benable\s+primitive_index\s*;/.test(shader.code)) { skipped.push(shader.path); continue; }
        device.pushErrorScope("validation");
        let compilationInfo;
        let validationError;
        try {
            const module = device.createShaderModule({ label: shader.path, code: shader.code });
            assert.equal(typeof module.getCompilationInfo, "function", "GPUShaderModule.getCompilationInfo() is required for WGSL tests");
            compilationInfo = await module.getCompilationInfo();
        } finally {
            validationError = await device.popErrorScope();
        }
        const moduleErrors = compilationInfo.messages.filter((message) => message.type === "error");
        for (const message of moduleErrors) errors.push(formatDiagnostic(shader.path, message));
        for (const message of compilationInfo.messages.filter((entry) => entry.type === "warning")) warnings.push(formatDiagnostic(shader.path, message));
        if (validationError && moduleErrors.length === 0) errors.push(`${shader.path}: ${validationError.message}`);
    }
    if (skipped.length > 0) console.warn(`skipped ${skipped.length} modules requiring the unavailable ${requirements[0]} feature:\n${skipped.join("\n")}`);
    for (const warning of warnings) console.warn(`warning: ${warning}`);
    assert.equal(errors.length, 0, errors.join("\n"));
}

// 2) WebGPU interop helpers preserve native descriptor behavior and reject invalid bindings.
{
    assert.equal(WasmGPU.webgpu, webgpuInterop);
    const rawEntry = { binding: 4, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba8unorm" } };
    const layout = webgpuInterop.bindGroupLayout({
        label: "interop-layout",
        entries: [
            webgpuInterop.uniformBufferLayout({ binding: 0, minBindingSize: 16 }),
            webgpuInterop.storageBufferLayout({ binding: 1, readOnly: true }),
            webgpuInterop.samplerLayout({ binding: 2 }),
            webgpuInterop.textureLayout({ binding: 3 }),
            rawEntry
        ]
    });
    assert.equal(layout.entries[0].buffer.type, "uniform");
    assert.equal(layout.entries[1].buffer.type, "read-only-storage");
    assert.equal(layout.entries[2].sampler.type, "filtering");
    assert.equal(layout.entries[3].texture.viewDimension, "2d");
    assert.deepEqual(layout.entries[4].storageTexture, rawEntry.storageTexture, "Raw WebGPU layout entry kinds must be accepted without interop-specific wrappers");
    assert.throws(() => webgpuInterop.bindGroupLayout({ entries: [webgpuInterop.uniformBufferLayout({ binding: 0 }), webgpuInterop.textureLayout({ binding: 0 })] }), /duplicate binding 0/);
    assert.throws(() => webgpuInterop.storageBufferLayout({ binding: -1 }), /non-negative integer/);
    assert.throws(() => webgpuInterop.bindGroupLayout({ entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE }] }), /exactly one/);

    const nativeBuffer = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM });
    const nativeSampler = device.createSampler();
    const nativeTexture = device.createTexture({ size: [1, 1], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING });
    const nativeView = nativeTexture.createView();
    const entries = webgpuInterop.bindGroupResources({ 0: { buffer: nativeBuffer, size: 16 }, 2: nativeSampler, 3: nativeView });
    assert.equal(entries[0].resource.buffer, nativeBuffer);
    assert.equal(entries[1].resource, nativeSampler);
    assert.equal(entries[2].resource, nativeView);
    assert.throws(() => webgpuInterop.bindGroupResources([{ binding: 0, resource: nativeBuffer }, { binding: 0, resource: nativeBuffer }]), /duplicate binding 0/);
    nativeBuffer.destroy();
    nativeTexture.destroy();
}

// 3) Cleanup waits for compilation work before destroying the browser GPU device.
{
    await destroyTestDevice(device);
}
