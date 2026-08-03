/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { readdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(TEST_DIR, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".test.js")).map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
const canUseColor = process.env.FORCE_COLOR !== "0" && (process.stdout.isTTY || !process.env.NO_COLOR);
const r = canUseColor ? "\x1b[31m" : "";
const g = canUseColor ? "\x1b[32m" : "";
const y = canUseColor ? "\x1b[33m" : "";
const x = canUseColor ? "\x1b[0m" : "";

test("browser WebGPU check", async ({ page }) => {
    const start = Date.now();
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
        try {
            context.configure({ device, format: navigator.gpu.getPreferredCanvasFormat() });
            const encoder = device.createCommandEncoder();
            const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: [0, 0, 0, 1], loadOp: "clear", storeOp: "store" }] });
            pass.end();
            device.queue.submit([encoder.finish()]);
            await device.queue.onSubmittedWorkDone();
        } finally {
            context.unconfigure();
            canvas.remove();
            device.destroy();
        }
        return { error: null, features, info };
    });
    expect(result.error).toBeNull();
    const stop = Date.now();
    console.log(`${g}[test:00:webgpu] passed in ${stop - start}ms, using adapter=${JSON.stringify(result.info)}, features=${result.features.join(",")}${x}`);
});

for (let i = 0; i < files.length; ++i) {
    const file = files[i];
    const name = file.replace(/\.test\.js$/, "");
    const index = (i + 1).toString().padStart(2, "0");
    test(`test/${file}`, async ({ page }) => {
        const start = Date.now();
        const consoleErrors = [];
        const pageErrors = [];
        page.on("pageerror", (error) => pageErrors.push(error));
        page.on("console", (message) => {
            const text = message.text();
            if (message.type() === "warning") console.warn(`${y}[test:${index}:${name}] ${text}${x}`);
            else if (message.type() === "error") { consoleErrors.push(text); console.error(`${r}[test:${index}:${name}] ${text}${x}`); }
            else if (text) console.log(`[test:${index}:${name}] ${text}`);
        });
        await page.goto("/test/index.html");
        await page.evaluate(async (moduleUrl) => { await import(moduleUrl); }, `/test/${file}`);
        await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
        expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
        expect(pageErrors, pageErrors.map((error) => error.stack ?? error.message).join("\n\n")).toEqual([]);
        const stop = Date.now();
        console.log(`${g}[test:${index}:${name}] passed in ${stop - start}ms${x}`);
    });
}
