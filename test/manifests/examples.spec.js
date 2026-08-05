/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { expect, test } from "@playwright/test";
import { colors, installWebGPUMonitor, settleWebGPUMonitor } from "../utils/helpers.js";
import { examples } from "./suites.js";
const optionalFailedRequests = new Map([["protein.html", ["https://files.rcsb.org/download/1VWT.pdb"]]]);
const { g, y, x } = colors;

test.use({ viewport: { width: 640, height: 360 } });

const isOptionalFailure = (example, url) => (optionalFailedRequests.get(example.file) ?? []).some((allowed) => url.startsWith(allowed));

const observeDiagnostics = (page, example) => {
    const diagnostics = { consoleErrors: [], failedRequests: [], pageErrors: [], responseErrors: [], warnings: [] };
    let crashed = false;
    page.on("console", (message) => {
        const location = message.location();
        const text = `${message.text()}${location.url ? ` (${location.url}:${location.lineNumber + 1})` : ""}`;
        if (message.type() === "error") diagnostics.consoleErrors.push(text);
        else if (message.type() === "warning") diagnostics.warnings.push(text);
    });
    page.on("pageerror", (error) => diagnostics.pageErrors.push(error.stack ?? error.message));
    page.on("crash", () => { crashed = true; });
    page.on("requestfailed", (request) => {
        const url = request.url();
        if (!isOptionalFailure(example, url)) diagnostics.failedRequests.push(`${request.failure()?.errorText ?? "request failed"}: ${url}`);
    });
    page.on("response", (response) => {
        const url = response.url();
        if (response.status() >= 400 && !isOptionalFailure(example, url) && !url.endsWith("/favicon.ico")) diagnostics.responseErrors.push(`${response.status()} ${response.statusText()}: ${url}`);
    });
    return { diagnostics, hasCrashed: () => crashed };
};

const exerciseExample = async (page, file) => {
    if (file === "controls.html") {
        await page.keyboard.press("2");
        await expect(page.locator(".nav")).toContainText("mode: trackball");
        await page.keyboard.press("c");
        await expect(page.locator(".nav")).toContainText("camera: orthographic");
    } else if (file === "fluid.html") {
        await page.keyboard.press("p");
        await expect(page.locator(".info")).toContainText("tracers: off");
        await page.keyboard.press("m");
        await expect(page.locator(".info")).toContainText("measure mode: distance");
    } else if (file === "overlay.html") {
        await page.locator("#ann-marker").dispatchEvent("click");
        await expect(page.locator("#ann-status")).toContainText("mode: marker");
        await page.locator("#ann-clear").dispatchEvent("click");
        await expect(page.locator("#ann-status")).toContainText("action: cleared");
    } else if (file === "picking.html") {
        await page.keyboard.press("2");
        await expect(page.locator(".nav")).toContainText("mode: trackball");
        await expect(page.locator(".pick")).toContainText("selectionCount: 0");
    } else if (file === "protein.html") {
        await page.keyboard.press("2");
        await expect(page.locator(".info")).toContainText("color mode: residue");
    } else if (file === "quantum.html") {
        await page.locator("#orbital").selectOption("2s");
        await expect(page.locator(".readout")).toContainText("orbital: 2s");
        await page.locator("#threshold").fill("7.5");
        await expect(page.locator("#threshold-value")).toHaveText("7.50%");
    } else if (file === "scaling.html") {
        await page.locator("#scale-colormap").selectOption("viridis");
        await page.locator("#scale-mode").selectOption("log");
        await page.locator("#scale-clamp").selectOption("range");
        await page.locator("#scale-apply").dispatchEvent("click");
        await expect(page.locator("#scale-status")).toContainText("colormap: viridis");
        await expect(page.locator("#scale-status")).toContainText("active mode/clamp: log / range");
        await page.locator("#scale-stats").dispatchEvent("click");
        await expect(page.locator("#scale-status")).toContainText("status: stats ready", { timeout: 30_000 });
    }
};

for (let i = 0; i < examples.length; ++i) {
    const example = examples[i];
    const name = example.file.replace(/\.html$/, "");
    const index = (i + 1).toString().padStart(2, "0");
    test(`examples/${example.file}`, async ({ page }) => {
        test.setTimeout(example.timeout ?? 120_000);
        const start = Date.now();
        await installWebGPUMonitor(page);
        const observed = observeDiagnostics(page, example);
        await page.goto(`/examples/${example.file}`, { timeout: 90_000, waitUntil: "domcontentloaded" });
        await expect(page).toHaveTitle(example.title);
        if (example.ready) await expect(page.locator(example.ready[0])).toContainText(example.ready[1], { timeout: example.readyTimeout ?? 90_000 });
        await expect.poll(() => page.evaluate(() => globalThis.__wasmgpuTestMonitor?.devices ?? 0), { timeout: 90_000 }).toBeGreaterThan(0);
        await expect.poll(() => page.evaluate(() => globalThis.__wasmgpuTestMonitor?.submissions ?? 0), { timeout: 90_000 }).toBeGreaterThan(0);
        await expect.poll(() => page.evaluate(() => globalThis.__wasmgpuTestMonitor?.completedSubmissions ?? 0), { timeout: 90_000 }).toBeGreaterThan(0);
        expect(await page.locator("canvas").evaluateAll((canvases) => canvases.some((canvas) => canvas.clientWidth > 0 && canvas.clientHeight > 0))).toBe(true);
        await exerciseExample(page, example.file);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const gpu = await settleWebGPUMonitor(page);
        for (const warning of observed.diagnostics.warnings) console.warn(`${y}[example:${index}:${name}] ${warning}${x}`);
        expect(observed.hasCrashed(), "The example page crashed.").toBe(false);
        expect(observed.diagnostics.consoleErrors, observed.diagnostics.consoleErrors.join("\n")).toEqual([]);
        expect(observed.diagnostics.pageErrors, observed.diagnostics.pageErrors.join("\n\n")).toEqual([]);
        expect(observed.diagnostics.failedRequests, observed.diagnostics.failedRequests.join("\n")).toEqual([]);
        expect(observed.diagnostics.responseErrors, observed.diagnostics.responseErrors.join("\n")).toEqual([]);
        expect(gpu.errors, gpu.errors.join("\n")).toEqual([]);
        expect(gpu.deviceLosses, gpu.deviceLosses.join("\n")).toEqual([]);
        const stop = Date.now();
        console.log(`${g}[example:${index}:${name}] passed in ${stop - start}ms, devices=${gpu.devices}, submissions=${gpu.submissions}${x}`);
    });
}
