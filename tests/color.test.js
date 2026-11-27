/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, destroyTestDevice, setupTest } from "./utils/helpers.js";
import * as WasmGPU from "../release/WasmGPU.js";

const { arraysApproxEqual, numberApproxEqual } = createApproxHelpers();

const { device } = await setupTest({ webgpu: true });
const { Colormap, parseColor, srgbToLinear, linearToSrgb, toOklab, fromOklab, paletteSwatch, domainColor } = WasmGPU;
const Engine = WasmGPU.WasmGPU;

const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const l2s = (c) => (c <= 0.0031308 ? c * 12.92 : (1.055 * Math.pow(c, 1 / 2.4)) - 0.055);
const texel = (lut, i) => Array.from(lut.slice(i * 4, i * 4 + 4));

// 1) Built-in maps resolve lazily to singletons, use 256-texel linear tables, and store sRGB-encoded bytes.
{
    const names = ["grayscale", "turbo", "viridis", "magma", "plasma", "inferno", "cividis", "coolwarm", "twilight", "hsv"];
    for (const name of names) {
        const cm = Colormap.builtin(name);
        assert.ok(cm instanceof Colormap, `Colormap.builtin('${name}') must return a Colormap`);
        assert.strictEqual(cm, Colormap.builtin(name), `Colormap.builtin('${name}') must be a singleton`);
        assert.strictEqual(cm.width, 256, `${name} width`);
        assert.strictEqual(cm.filter, "linear", `${name} filter`);
        assert.strictEqual(cm.canSampleCPU, true, `${name} must sample on the CPU`);
        assert.strictEqual(cm.getLUT().length, 256 * 4, `${name} LUT length`);
    }
    assert.throws(() => Colormap.builtin("jet"), /Colormap\.builtin: unknown colormap/);

    const viridis = Colormap.builtin("viridis").getLUT();
    arraysApproxEqual(texel(viridis, 0), [68, 1, 84, 255], 1, "viridis first texel");
    arraysApproxEqual(texel(viridis, 255), [253, 231, 37, 255], 1, "viridis last texel");
    const lutCopy = Colormap.builtin("viridis").getLUT();
    lutCopy[0] = 0;
    assert.strictEqual(Colormap.builtin("viridis").getLUT()[0], viridis[0], "getLUT() must return a copy");

    const gray = Colormap.builtin("grayscale").getLUT();
    for (let i = 0; i < 256; i++) assert.deepStrictEqual(texel(gray, i), [i, i, i, 255], `grayscale texel ${i} must be an exact ramp`);
    const grayLinear = Colormap.builtin("grayscale").getLUT("linear");
    assert.strictEqual(grayLinear[128 * 4], Math.round(255 * s2l(128 / 255)), "getLUT('linear') must decode each texel");
    assert.strictEqual(grayLinear[128 * 4 + 3], 255, "getLUT('linear') must keep alpha");

    const hsv = Colormap.builtin("hsv").getLUT();
    assert.deepStrictEqual(texel(hsv, 0), [255, 0, 0, 255], "hsv must start at red");
    assert.deepStrictEqual(texel(hsv, 255), texel(hsv, 0), "hsv must be cyclic");
    const twilight = Colormap.builtin("twilight").getLUT();
    assert.deepStrictEqual(texel(twilight, 255), texel(twilight, 0), "twilight must be cyclic");
}

// 2) Palettes are nearest-filtered singletons, and swatches wrap, scale alpha, and accept caller arrays.
{
    const expected = { tab10: 10, okabeito: 8, chartjs: 7 };
    for (const [name, width] of Object.entries(expected)) {
        const palette = Colormap.palette(name);
        assert.strictEqual(palette, Colormap.palette(name), `Colormap.palette('${name}') must be a singleton`);
        assert.strictEqual(palette.width, width, `${name} width`);
        assert.strictEqual(palette.filter, "nearest", `${name} filter`);
        arraysApproxEqual(paletteSwatch(name, width), paletteSwatch(name, 0), 0, `${name} must wrap forward`);
        arraysApproxEqual(paletteSwatch(name, -1), paletteSwatch(name, width - 1), 0, `${name} must wrap backward`);
    }
    assert.throws(() => Colormap.palette("viridis"), /Colormap\.palette: unknown palette/);
    assert.deepStrictEqual(texel(Colormap.palette("tab10").getLUT(), 0), [0x1f, 0x77, 0xb4, 255], "tab10 swatch 0 bytes");
    arraysApproxEqual(paletteSwatch("tab10", 0), parseColor("#1f77b4"), 1e-12, "paletteSwatch must return linear colors");
    arraysApproxEqual(paletteSwatch("okabeito", 1, 0.25), [...parseColor("#e69f00").slice(0, 3), 0.25], 1e-12, "paletteSwatch must scale alpha");
    const custom = [[0.1, 0.2, 0.3, 0.5], [0.4, 0.5, 0.6, 1]];
    arraysApproxEqual(paletteSwatch(custom, 3, 0.5), [0.4, 0.5, 0.6, 0.5], 1e-12, "paletteSwatch must accept caller arrays as linear colors");
    assert.throws(() => paletteSwatch("tab10", 0.5), /paletteSwatch: index must be an integer/);
    assert.throws(() => paletteSwatch("tab10", 0, 2), /paletteSwatch: alpha/);
}

// 3) CPU sampling follows GPU texel addressing: nearest uses floor(t * w), linear decodes texels and filters around texel centers.
{
    const half = 128 / 255;
    const palette = Colormap.fromPalette([[half, 0, 0, 1], [0, half, 0, 1], [0, 0, half, 1]]);
    assert.strictEqual(palette.filter, "nearest", "fromPalette must default to nearest filtering");
    const h = s2l(half);
    const nearestCases = [[0, [h, 0, 0, 1]], [0.333, [h, 0, 0, 1]], [0.334, [0, h, 0, 1]], [0.666, [0, h, 0, 1]], [0.667, [0, 0, h, 1]], [1, [0, 0, h, 1]], [NaN, [h, 0, 0, 1]], [-1, [h, 0, 0, 1]], [2, [0, 0, h, 1]]];
    for (const [t, linear] of nearestCases) {
        arraysApproxEqual(palette.sampleCPU(t), linear, 1e-9, `nearest sampleCPU(${t})`);
        arraysApproxEqual(palette.sampleCPU(t, "srgb"), [l2s(linear[0]), l2s(linear[1]), l2s(linear[2]), 1], 1e-9, `nearest sampleCPU(${t}, 'srgb')`);
    }

    const ramp = Colormap.fromStops([[0, 0, 0, 1], [1, 1, 1, 1]], { resolution: 3 });
    assert.deepStrictEqual(Array.from(ramp.getLUT()), [0, 0, 0, 255, 128, 128, 128, 255, 255, 255, 255, 255], "3-texel ramp bytes");
    const mid = s2l(128 / 255);
    const linearCases = [[0, 0], [1 / 6, 0], [0.25, 0.25 * mid], [0.5, mid], [0.75, mid + 0.75 * (1 - mid)], [5 / 6, 1], [1, 1], [NaN, 0], [-0.5, 0], [1.5, 1]];
    for (const [t, value] of linearCases) {
        arraysApproxEqual(ramp.sampleCPU(t), [value, value, value, 1], 1e-9, `linear sampleCPU(${t})`);
        arraysApproxEqual(ramp.sampleCPU(t, "srgb"), [l2s(value), l2s(value), l2s(value), 1], 1e-9, `linear sampleCPU(${t}, 'srgb')`);
    }
}

// 4) fromStops interprets stop colors in colorSpace, interpolates in the requested space, keeps hard edges, and validates input.
{
    const blackWhite = [[0, 0, 0, 1], [1, 1, 1, 1]];
    const srgbMid = Colormap.fromStops(blackWhite, { resolution: 3, interpolation: "srgb" }).getLUT()[4];
    const linearMid = Colormap.fromStops(blackWhite, { resolution: 3, interpolation: "linear" });
    const oklabMid = Colormap.fromStops(blackWhite, { resolution: 3, interpolation: "oklab" }).getLUT()[4];
    assert.strictEqual(srgbMid, 128, "sRGB interpolation midpoint");
    assert.strictEqual(linearMid.getLUT()[4], Math.round(255 * l2s(0.5)), "linear interpolation midpoint bytes");
    numberApproxEqual(linearMid.sampleCPU(0.5)[0], 0.5, 1 / 255, "linear interpolation midpoint must survive one 8-bit round trip");
    assert.strictEqual(oklabMid, Math.round(255 * l2s(0.125)), "OKLab interpolation midpoint");
    assert.notStrictEqual(oklabMid, srgbMid, "OKLab and sRGB midpoints must differ");

    const flat = [[0.2, 0.2, 0.2, 1], [0.2, 0.2, 0.2, 1]];
    assert.strictEqual(Colormap.fromStops(flat).getLUT()[0], 51, "sRGB stops are stored as given");
    assert.strictEqual(Colormap.fromStops(flat, { colorSpace: "linear" }).getLUT()[0], Math.round(255 * l2s(0.2)), "linear stops are encoded to sRGB");
    assert.strictEqual(Colormap.fromStops(flat, { colorSpace: "linear", interpolation: "oklab" }).getLUT()[0], Math.round(255 * l2s(0.2)), "OKLab interpolation of equal stops is lossless");

    const edge = Colormap.fromStops([{ t: 0, color: [1, 0, 0, 1] }, { t: 0.5, color: [1, 0, 0, 1] }, { t: 0.5, color: [0, 0, 1, 1] }, { t: 1, color: [0, 0, 1, 1] }]).getLUT();
    assert.deepStrictEqual(texel(edge, 127), [255, 0, 0, 255], "duplicate t must keep the left color up to the edge");
    assert.deepStrictEqual(texel(edge, 128), [0, 0, 255, 255], "duplicate t must switch to the right color after the edge");
    const padded = Colormap.fromStops([{ t: 0.25, color: [1, 0, 0, 1] }, { t: 0.75, color: [0, 0, 1, 1] }], { resolution: 5 }).getLUT();
    assert.deepStrictEqual(texel(padded, 0), [255, 0, 0, 255], "ends are padded with the first stop");
    assert.deepStrictEqual(texel(padded, 4), [0, 0, 255, 255], "ends are padded with the last stop");
    const alpha = Colormap.fromStops([[1, 1, 1, 0], [1, 1, 1, 1]], { resolution: 3 }).getLUT();
    assert.strictEqual(alpha[7], 128, "alpha is interpolated linearly");

    assert.strictEqual(Colormap.fromStops(blackWhite).width, 256, "default resolution");
    assert.strictEqual(Colormap.fromStops(blackWhite, { resolution: 8192 }).width, 8192, "maximum resolution");
    assert.throws(() => Colormap.fromStops([]), /at least 2 stops/);
    assert.throws(() => Colormap.fromStops([[0, 0, 0, 1]]), /at least 2 stops/);
    assert.throws(() => Colormap.fromStops([{ t: NaN, color: [0, 0, 0, 1] }, { t: 1, color: [1, 1, 1, 1] }]), /non-finite t/);
    assert.throws(() => Colormap.fromStops([[0, 0, 0], [1, 1, 1, 1]]), /length-4 array/);
    for (const resolution of [1, 8193, 2.5, NaN]) assert.throws(() => Colormap.fromStops(blackWhite, { resolution }), /resolution must be an integer/);
    assert.throws(() => Colormap.fromPalette([]), /at least 1 color/);
}

// 5) reversed() reverses the table, keeps the filter, and is cached in both directions.
{
    const base = Colormap.builtin("magma");
    const reversed = base.reversed();
    assert.strictEqual(base.reversed(), reversed, "reversed() must be cached");
    assert.strictEqual(reversed.reversed(), base, "reversing twice must return the original");
    assert.notStrictEqual(reversed.id, base.id, "reversed maps need their own id");
    assert.strictEqual(reversed.filter, base.filter);
    assert.strictEqual(reversed.width, base.width);
    const a = base.getLUT();
    const b = reversed.getLUT();
    for (let i = 0; i < 256; i++) assert.deepStrictEqual(texel(b, i), texel(a, 255 - i), `reversed texel ${i}`);
    const palette = Colormap.palette("okabeito").reversed();
    assert.strictEqual(palette.filter, "nearest");
    arraysApproxEqual(palette.sampleCPU(0), paletteSwatch("okabeito", -1), 1e-12, "reversed palette must start with the last swatch");
}

// 6) Utilities parse CSS colors to linear, round-trip transfer functions and OKLab, and produce domain colors.
{
    arraysApproxEqual(parseColor("#f00"), [1, 0, 0, 1], 0, "#rgb");
    arraysApproxEqual(parseColor("#F008"), [1, 0, 0, 0x88 / 255], 1e-12, "#rgba");
    arraysApproxEqual(parseColor("#808080"), [s2l(128 / 255), s2l(128 / 255), s2l(128 / 255), 1], 1e-12, "#rrggbb returns linear");
    arraysApproxEqual(parseColor("#00ff0080"), [0, 1, 0, 128 / 255], 1e-12, "#rrggbbaa");
    arraysApproxEqual(parseColor("rgb(255, 0, 128)"), [1, 0, s2l(128 / 255), 1], 1e-12, "rgb()");
    arraysApproxEqual(parseColor(" RGBA(0,0,255,0.5) "), [0, 0, 1, 0.5], 1e-12, "rgba() with whitespace and case");
    for (const bad of ["red", "#12", "#12345", "rgb(256, 0, 0)", "rgb(1, 2)", "rgb(1, 2, 3, 1)", "rgba(1, 2, 3)", "rgba(1, 2, 3, 1.5)", "rgb(1.5, 2, 3)", "hsl(0, 0%, 0%)", ""]) {
        assert.throws(() => parseColor(bad), /parseColor: unsupported color/, `parseColor(${JSON.stringify(bad)}) must throw`);
    }

    for (const c of [[0, 0.002, 0.5, 0.3], [1, 0.04, 0.2, 1], [0.7, 0.9, 0.0031308, 0]]) {
        arraysApproxEqual(srgbToLinear(linearToSrgb(c)), c, 1e-12, "sRGB transfer round trip");
        arraysApproxEqual(fromOklab(toOklab(c)), c, 1e-6, "OKLab round trip");
    }
    arraysApproxEqual(toOklab([1, 1, 1, 1]), [1, 0, 0, 1], 1e-6, "OKLab of white");
    assert.strictEqual(linearToSrgb([0.5, 0.5, 0.5, 0.25])[3], 0.25, "alpha passes through conversions");

    assert.deepStrictEqual(domainColor(0, 0), [0, 0, 0, 1], "zero is black");
    assert.deepStrictEqual(domainColor(NaN, 1), [1, 1, 1, 1], "non-finite input is white");
    assert.deepStrictEqual(domainColor(Infinity, 0), [1, 1, 1, 1], "infinite input is white");
    assert.deepStrictEqual(domainColor(1e308, 1e308), [1, 1, 1, 1], "an infinite modulus is white");
    arraysApproxEqual(domainColor(1, 0), [1, 0, 0, 1], 1e-9, "|f| = 1 at arg 0 is the pure hsv hue (red)");
    const twilight = Colormap.builtin("twilight");
    arraysApproxEqual(domainColor(0, 3, { mode: "argument", colormap: "twilight" }), twilight.sampleCPU(0.25), 1e-12, "argument mode samples arg / 2π");
    arraysApproxEqual(domainColor(0, -3, { mode: "argument", colormap: twilight }), twilight.sampleCPU(0.75), 1e-12, "argument mode wraps negative angles");
    arraysApproxEqual(domainColor(0, 2, { mode: "modulus", colormap: "twilight", range: [0, 4] }), twilight.sampleCPU(0.5), 1e-12, "modulus mode normalizes by range");
    arraysApproxEqual(domainColor(3, 4, { mode: "modulus", colormap: "twilight", range: [0, 4] }), twilight.sampleCPU(1), 1e-12, "modulus mode clamps");
    arraysApproxEqual(domainColor(3, 4, { mode: "modulus", range: [2, 2] }), Colormap.builtin("viridis").sampleCPU(0.5), 1e-12, "a degenerate range maps to t = 0.5 with viridis by default");
    const dark = domainColor(0.25, 0);
    const bright = domainColor(4, 0);
    assert.ok(dark[0] < 1 && dark[0] > 0 && dark[1] === 0, "small moduli darken the hue");
    assert.ok(bright[0] === 1 && bright[1] > 0 && bright[2] > 0, "large moduli lighten the hue");
}

// 7) GPU tables upload as rgba8unorm-srgb, are cached per device, wrap external views, and match CPU sampling.
{
    const magma = Colormap.builtin("magma");
    const r1 = magma.getGPUResources(device, device.queue);
    const r2 = magma.getGPUResources(device, device.queue);
    assert.ok(r1.texture, "Built-in colormaps must create an internal GPUTexture");
    assert.strictEqual(r1.texture.format, "rgba8unorm-srgb", "Colormap textures must be sRGB so shaders sample linear values");
    assert.strictEqual(r1.texture.dimension, "1d");
    assert.strictEqual(r1.width, 256);
    assert.strictEqual(r1.filter, "linear");
    assert.strictEqual(r1.texture, r2.texture, "GPU resources must be cached per device");
    assert.strictEqual(r1.view, r2.view);
    assert.strictEqual(r1.sampler, r2.sampler);

    const externalTexture = device.createTexture({ size: { width: 4, height: 1, depthOrArrayLayers: 1 }, dimension: "1d", format: "rgba8unorm-srgb", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    const externalView = externalTexture.createView({ dimension: "1d" });
    const externalSampler = device.createSampler({ magFilter: "nearest", minFilter: "nearest" });
    const external = Colormap.fromGPUTextureView(device, externalView, externalSampler, 4, "nearest");
    const r = external.getGPUResources(device, device.queue);
    assert.strictEqual(r.texture, null, "External colormaps must not create textures");
    assert.strictEqual(r.view, externalView);
    assert.strictEqual(r.sampler, externalSampler);
    assert.strictEqual(r.width, 4);
    assert.strictEqual(r.filter, "nearest");
    assert.strictEqual(external.canSampleCPU, false);
    assert.throws(() => external.sampleCPU(0.5), /CPU sampling is unavailable/);
    assert.throws(() => external.getLUT(), /CPU sampling is unavailable/);
    assert.throws(() => external.reversed(), /Colormap\.reversed/);
    externalTexture.destroy();

    const module = device.createShaderModule({
        code: `
            @group(0) @binding(0) var lut: texture_1d<f32>;
            @group(0) @binding(1) var lut_sampler: sampler;
            @group(0) @binding(2) var<storage, read> ts: array<f32>;
            @group(0) @binding(3) var<storage, read_write> colors: array<vec4<f32>>;
            @compute @workgroup_size(64)
            fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
                if (gid.x >= arrayLength(&ts)) { return; }
                colors[gid.x] = textureSampleLevel(lut, lut_sampler, ts[gid.x], 0.0);
            }
        `
    });
    const pipeline = device.createComputePipeline({ layout: "auto", compute: { module, entryPoint: "main" } });
    const ts = new Float32Array([0, 0.03, 0.1, 0.17, 0.2, 0.25, 0.33, 0.4, 0.5, 0.55, 0.6, 0.7, 0.75, 0.83, 0.9, 1]);
    const sampleGPU = async (colormap) => {
        const resources = colormap.getGPUResources(device, device.queue);
        const input = device.createBuffer({ size: ts.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
        const output = device.createBuffer({ size: ts.length * 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
        const readback = device.createBuffer({ size: ts.length * 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        device.queue.writeBuffer(input, 0, ts);
        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: resources.view },
                { binding: 1, resource: resources.sampler },
                { binding: 2, resource: { buffer: input } },
                { binding: 3, resource: { buffer: output } }
            ]
        });
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(1);
        pass.end();
        encoder.copyBufferToBuffer(output, 0, readback, 0, ts.length * 16);
        device.queue.submit([encoder.finish()]);
        await readback.mapAsync(GPUMapMode.READ);
        const values = new Float32Array(readback.getMappedRange()).slice();
        readback.unmap();
        input.destroy();
        output.destroy();
        readback.destroy();
        return values;
    };
    const parityCases = [
        ["viridis", Colormap.builtin("viridis")],
        ["3-texel fromStops", Colormap.fromStops([[0.1, 0.2, 0.9, 1], [0.95, 0.5, 0.1, 0.6], [0.3, 0.9, 0.3, 0.2]], { resolution: 3 })]
    ];
    for (const [label, colormap] of parityCases) {
        const gpu = await sampleGPU(colormap);
        for (let i = 0; i < ts.length; i++) arraysApproxEqual(Array.from(gpu.slice(i * 4, i * 4 + 4)), colormap.sampleCPU(ts[i], "linear"), 2 / 255, `${label} GPU/CPU parity at t = ${ts[i]}`);
    }
    const viridisMid = linearToSrgb(Array.from((await sampleGPU(Colormap.builtin("viridis"))).slice(8 * 4, 8 * 4 + 4)));
    arraysApproxEqual(viridisMid.slice(0, 3).map((c) => Math.round(c * 255)), [0x21, 0x91, 0x8c], 2, "GPU viridis(0.5) must decode to about #21918C");
}

// 8) The engine exposes one frozen color namespace through static and instance getters, and wgpu.colormap is gone.
{
    const color = Engine.color;
    assert.ok(color && typeof color === "object", "WasmGPU.color missing");
    assert.strictEqual(Object.create(Engine.prototype).color, color, "Static and instance color getters must return the same object");
    assert.strictEqual(Object.create(Engine.prototype).colormap, undefined, "wgpu.colormap must be removed");
    assert.ok(Object.isFrozen(color) && Object.isFrozen(color.map) && Object.isFrozen(color.palette), "The color namespace must be frozen");
    assert.deepStrictEqual(Object.keys(color), ["map", "palette", "parse", "srgbToLinear", "linearToSrgb", "toOklab", "fromOklab", "domain"]);
    assert.deepStrictEqual(Object.keys(color.map), ["builtin", "grayscale", "turbo", "viridis", "magma", "plasma", "inferno", "cividis", "coolwarm", "twilight", "hsv", "fromStops", "fromPalette", "fromGPUTextureView"]);
    assert.deepStrictEqual(Object.keys(color.palette), ["builtin", "tab10", "okabeito", "chartjs", "swatch"]);
    assert.strictEqual(color.map.twilight(), Colormap.builtin("twilight"));
    assert.strictEqual(color.map.builtin("hsv"), Colormap.builtin("hsv"));
    assert.strictEqual(color.palette.okabeito(), Colormap.palette("okabeito"));
    assert.strictEqual(color.palette.builtin("chartjs"), Colormap.palette("chartjs"));
    arraysApproxEqual(color.palette.swatch("tab10", 11, 0.5), paletteSwatch("tab10", 1, 0.5), 0);
    assert.strictEqual(color.parse, parseColor);
    arraysApproxEqual(color.domain(0, 1), domainColor(0, 1), 0);
    assert.strictEqual(color.map.fromStops([[0, 0, 0, 1], [1, 1, 1, 1]], { resolution: 4 }).width, 4);
    assert.strictEqual(color.map.fromPalette([[1, 0, 0, 1]]).filter, "nearest");
}

// 9) Cleanup waits for shared GPU work before destroying the browser device.
{
    await destroyTestDevice(device);
}
