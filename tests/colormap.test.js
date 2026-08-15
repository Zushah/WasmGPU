/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, destroyTestDevice, setupTest } from "./utils/helpers.js";
import * as WasmGPU from "../release/WasmGPU.js";

const { numberApproxEqual } = createApproxHelpers();

const { device } = await setupTest({ webgpu: true });
const { Colormap } = WasmGPU;

// 1) Built-in maps should exist and be singletons (same instance per name).
{
    assert.strictEqual(typeof Colormap.builtin, "function", "Colormap.builtin missing");

    const v1 = Colormap.builtin("viridis");
    const v2 = Colormap.builtin("viridis");
    assert.ok(v1 && typeof v1 === "object", "Colormap.builtin('viridis') did not return an object");
    assert.strictEqual(v1, v2, "Expected Colormap.builtin to return a singleton instance per built-in name");

    // Basic property sanity
    assert.ok(Number.isFinite(v1.width) && v1.width > 0, "Colormap.width should be a positive finite number");
    assert.strictEqual(v1.filter, "linear", "Expected built-in viridis filter to default to linear");

    // Ensure all required built-in names are accepted
    const names = ["grayscale", "turbo", "viridis", "magma", "plasma", "inferno"];
    for (const name of names) {
        const cm = Colormap.builtin(name);
        assert.ok(cm, `Colormap.builtin('${name}') returned null/undefined`);
        assert.ok(cm.width >= 2, `Colormap '${name}' should have width >= 2`);
    }
}

// 2) fromStops(): should accept multi-stop gradients (continuous) and allocate a LUT with the requested resolution.
{
    assert.strictEqual(typeof Colormap.fromStops, "function", "Colormap.fromStops missing");

    const cmDefault = Colormap.fromStops(
        [
            { t: 0.0, color: [0.0, 0.0, 0.0, 1.0] },
            { t: 1.0, color: [1.0, 1.0, 1.0, 1.0] }
        ]
    );
    assert.strictEqual(cmDefault.filter, "linear", "Expected Colormap.fromStops default filter to be linear");
    assert.ok(cmDefault.width >= 2, "Expected Colormap.fromStops width >= 2");

    const cm16 = Colormap.fromStops(
        [
            { t: 0.0, color: [0.0, 0.0, 0.4, 1.0] },
            { t: 0.5, color: [1.0, 1.0, 1.0, 1.0] },
            { t: 1.0, color: [0.4, 0.0, 0.0, 1.0] }
        ],
        { resolution: 16, filter: "linear", colorSpace: "srgb" }
    );
    assert.strictEqual(cm16.width, 16, "Colormap.fromStops resolution not respected");

    // Invalid input should throw
    let threw = false;
    try {
        Colormap.fromStops([]);
    } catch (e) {
        threw = true;
    }
    assert.strictEqual(threw, true, "Expected Colormap.fromStops([]) to throw");
}

// 3) fromPalette(): should accept discrete categorical palettes and default to nearest filtering.
{
    assert.strictEqual(typeof Colormap.fromPalette, "function", "Colormap.fromPalette missing");

    const palette = [
        [1.0, 0.0, 0.0, 1.0],
        [0.0, 1.0, 0.0, 1.0],
        [0.0, 0.0, 1.0, 1.0]
    ];

    const cm = Colormap.fromPalette(palette);
    assert.strictEqual(cm.width, palette.length, "Colormap.fromPalette width mismatch");
    assert.strictEqual(cm.filter, "nearest", "Expected Colormap.fromPalette default filter to be nearest");
}

// 4) GPU upload path: getGPUResources() should allocate a 1D RGBA8 texture + sampler and return stable cached resources.
{
    const cm = Colormap.builtin("magma");
    assert.strictEqual(typeof cm.getGPUResources, "function", "Colormap.getGPUResources missing");

    const r1 = cm.getGPUResources(device, device.queue);
    assert.ok(r1, "getGPUResources returned null/undefined");
    assert.ok(r1.view, "Colormap GPU resources missing texture view");
    assert.ok(r1.sampler, "Colormap GPU resources missing sampler");
    assert.ok(r1.texture, "Built-in colormap should create an internal GPUTexture");
    assert.ok(r1.width >= 2, "Colormap GPU width should be >= 2");

    const r2 = cm.getGPUResources(device, device.queue);
    assert.strictEqual(r1.view, r2.view, "Expected getGPUResources to return cached view for the same device");
    assert.strictEqual(r1.sampler, r2.sampler, "Expected getGPUResources to return cached sampler for the same device");
    assert.strictEqual(r1.texture, r2.texture, "Expected getGPUResources to return cached texture for the same device");
}

// 5) External injection path: fromGPUTextureView() should wrap caller-provided view/sampler without allocating its own texture.
{
    assert.strictEqual(typeof Colormap.fromGPUTextureView, "function", "Colormap.fromGPUTextureView missing");

    const width = 4;

    const tex = device.createTexture({
        label: "test:colormap:external:tex1d",
        size: { width, height: 1, depthOrArrayLayers: 1 },
        dimension: "1d",
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });

    // Write 4 texels (padded to 256 bytesPerRow)
    const rgba = new Uint8Array(256);
    // red, green, blue, white
    rgba.set([255, 0, 0, 255], 0);
    rgba.set([0, 255, 0, 255], 4);
    rgba.set([0, 0, 255, 255], 8);
    rgba.set([255, 255, 255, 255], 12);

    device.queue.writeTexture(
        { texture: tex },
        rgba,
        { bytesPerRow: 256, rowsPerImage: 1 },
        { width, height: 1, depthOrArrayLayers: 1 }
    );

    const view = tex.createView({ dimension: "1d" });
    const sampler = device.createSampler({
        addressModeU: "clamp-to-edge",
        magFilter: "nearest",
        minFilter: "nearest",
        mipmapFilter: "nearest"
    });

    const wrapped = Colormap.fromGPUTextureView(device, view, sampler, width, "nearest");
    const r = wrapped.getGPUResources(device, device.queue);

    assert.strictEqual(r.texture, null, "External colormap wrapper should not create its own GPUTexture");
    assert.strictEqual(r.view, view, "External colormap wrapper should return the same texture view");
    assert.strictEqual(r.sampler, sampler, "External colormap wrapper should return the same sampler");
    assert.strictEqual(r.width, width, "External colormap wrapper width mismatch");
    assert.strictEqual(r.filter, "nearest", "External colormap wrapper filter mismatch");

    tex.destroy();
}

// 6) Uniform stop bridge: toUniformStops() should return <= 8 vec4 stops with sane ranges.
{
    const cm = Colormap.builtin("viridis");
    assert.strictEqual(typeof cm.toUniformStops, "function", "Colormap.toUniformStops missing");

    const stops = cm.toUniformStops();
    assert.ok(Array.isArray(stops), "toUniformStops() should return an array");
    assert.strictEqual(stops.length, 8, "toUniformStops() default should return 8 stops");

    for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        assert.ok(Array.isArray(s) && s.length === 4, `Stop ${i} should be a vec4 array`);
        for (let k = 0; k < 4; k++) {
            numberApproxEqual(Math.min(1, Math.max(0, s[k])), s[k], 1e-6, `Stop ${i} channel ${k} out of [0,1] range`);
        }
    }
}

// 7) Cleanup waits for shared GPU work before destroying the browser device.
{
    await destroyTestDevice(device);
}
