/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { destroyTestDevice, setupTest } from "./utils/helpers.js";

const extractBundledShaders = (bundle) => {
    const markerPattern = /^\/\/ (src\/wgsl\/[^\r\n]+\.wgsl)\r?$/gm;
    const shaderPattern = /^\/\/ (src\/wgsl\/[^\r\n]+\.wgsl)\r?\nvar [A-Za-z_$][\w$]* = ("(?:[^"\\]|\\.)*");\r?$/gm;
    const markerPaths = Array.from(bundle.matchAll(markerPattern), (match) => match[1]);
    const shaders = Array.from(bundle.matchAll(shaderPattern), (match) => ({ path: match[1], code: JSON.parse(match[2]) }));
    assert.ok(markerPaths.length > 0, "No bundled WGSL modules found in ./dist/WasmGPU.js");
    assert.equal(shaders.length, markerPaths.length, `Expected to extract ${markerPaths.length} bundled WGSL modules, extracted ${shaders.length}`);
    assert.deepEqual(shaders.map((shader) => shader.path), markerPaths, "Bundled WGSL extraction must preserve every esbuild shader section");
    assert.equal(new Set(markerPaths).size, markerPaths.length, "Bundled WGSL module paths must be unique");
    return shaders;
};

const formatDiagnostic = (path, message) => { const location = message.lineNum > 0 ? `:${message.lineNum}:${message.linePos}` : ""; return `${path}${location}: ${message.message}`; };

const bundleResponse = await fetch(new URL("../dist/WasmGPU.js", import.meta.url));
assert.ok(bundleResponse.ok, `Failed to fetch ./dist/WasmGPU.js: ${bundleResponse.status}`);
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

// 2) Cleanup waits for compilation work before destroying the browser GPU device.
{
    await destroyTestDevice(device);
}
