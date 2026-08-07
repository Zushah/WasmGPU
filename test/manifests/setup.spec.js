/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { colors, installWebGPUMonitor, settleWebGPUMonitor } from "../utils/helpers.js";
import { examples } from "./suites.js";
const EXAMPLES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../examples");
const { g, x } = colors;

test("WebGPU", async ({ page }) => {
    const start = Date.now();
    await installWebGPUMonitor(page);
    await page.goto("/test/index.html");
    const result = await page.evaluate(async () => {
        if (!globalThis.isSecureContext) return { error: "The test origin is not a secure context." };
        if (!navigator.gpu) return { error: "navigator.gpu is unavailable." };
        const { requestTestAdapter } = await import("/test/utils/webgpu.js");
        const adapter = await requestTestAdapter(navigator.gpu);
        if (!adapter) return { error: "navigator.gpu.requestAdapter() returned null." };
        const device = await adapter.requestDevice();
        const info = adapter.info ? {
            architecture: adapter.info.architecture,
            description: adapter.info.description,
            device: adapter.info.device,
            vendor: adapter.info.vendor
        } : null;
        const features = Array.from(adapter.features).sort();
        const canvas = document.createElement("canvas");
        canvas.width = 4;
        canvas.height = 4;
        document.body.appendChild(canvas);
        const context = canvas.getContext("webgpu");
        if (!context) { canvas.remove(); device.destroy(); return { error: "canvas.getContext(\"webgpu\") returned null." }; }
        context.configure({ device, format: navigator.gpu.getPreferredCanvasFormat() });
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: [0, 0, 0, 1], loadOp: "clear", storeOp: "store" }] });
        pass.end();
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        return { error: null, features, info };
    });
    const gpu = await settleWebGPUMonitor(page);
    expect(result.error).toBeNull();
    expect(gpu.devices).toBeGreaterThan(0);
    expect(gpu.submissions).toBeGreaterThan(0);
    expect(gpu.completedSubmissions).toBeGreaterThan(0);
    expect(gpu.errors, gpu.errors.join("\n")).toEqual([]);
    expect(gpu.deviceLosses, gpu.deviceLosses.join("\n")).toEqual([]);
    const stop = Date.now();
    console.log(`${g}[setup:01:webgpu] passed in ${stop - start}ms, devices=${gpu.devices}, submissions=${gpu.submissions}, adapter=${JSON.stringify(result.info)}, features=${result.features.join(",")}${x}`);
});

test("Examples", () => {
    const discovered = readdirSync(EXAMPLES_DIR, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".html")).map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
    expect(examples.map((example) => example.file)).toEqual(discovered);
    console.log(`${g}[setup:02:examples] passed, discovered ${discovered.length} examples${x}`);
});
