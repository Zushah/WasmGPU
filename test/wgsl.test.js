/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "assert";
import { readFile } from "node:fs/promises";
import { create, globals } from "webgpu";

Object.assign(globalThis, globals);
const navigator = { gpu: create([]) };
Object.defineProperty(globalThis, "navigator", { value: navigator, configurable: true });

const extractBundledShaders = (bundle) => {
    const markerPattern = /^\/\/ (src\/wgsl\/[^\r\n]+\.wgsl)\r?$/gm;
    const shaderPattern = /^\/\/ (src\/wgsl\/[^\r\n]+\.wgsl)\r?\nvar [A-Za-z_$][\w$]* = ("(?:[^"\\]|\\.)*");\r?$/gm;
    const markerPaths = Array.from(bundle.matchAll(markerPattern), (match) => match[1]);
    const shaders = Array.from(bundle.matchAll(shaderPattern), (match) => ({ path: match[1], code: JSON.parse(match[2]) }));
    assert.ok(markerPaths.length > 0, "No bundled WGSL modules found in dist/WasmGPU.js");
    assert.equal(shaders.length, markerPaths.length, `Expected to extract ${markerPaths.length} bundled WGSL modules, extracted ${shaders.length}`);
    assert.deepEqual(shaders.map((shader) => shader.path), markerPaths, "Bundled WGSL extraction must preserve every esbuild shader section");
    assert.equal(new Set(markerPaths).size, markerPaths.length, "Bundled WGSL module paths must be unique");
    return shaders;
};

const formatDiagnostic = (path, message) => { const location = message.lineNum > 0 ? `:${message.lineNum}:${message.linePos}` : ""; return `${path}${location}: ${message.message}`; };

const bundle = await readFile(new URL("../dist/WasmGPU.js", import.meta.url), "utf8");
const shaders = extractBundledShaders(bundle);
const gpu = navigator.gpu;
assert.ok(gpu, "WebGPU not available. Ensure the dev dependency 'webgpu' is installed.");
const adapter = await gpu.requestAdapter();
assert.ok(adapter, "Failed to acquire a WebGPU adapter");
assert.ok(adapter.features.has("primitive-index"), "The WebGPU adapter must support the 'primitive-index' feature required by WasmGPU picking shaders");
const device = await adapter.requestDevice({ requiredFeatures: ["primitive-index"] });
assert.ok(device, "Failed to acquire a WebGPU device");

const errors = [];
const warnings = [];
try {
    for (const shader of shaders) {
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
    for (const warning of warnings) console.warn(`[wgsl] warning: ${warning}`);
    assert.equal(errors.length, 0, errors.join("\n"));
} finally {
    device.destroy();
}
