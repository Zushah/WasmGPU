/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { expect, test } from "@playwright/test";
import { colors, installWebGPUMonitor, settleWebGPUMonitor } from "../utils/helpers.js";
import { testFiles } from "./suites.js";

const { r, g, y, x } = colors;

for (let i = 0; i < testFiles.length; ++i) {
    const file = testFiles[i];
    const name = file.replace(/\.test\.js$/, "");
    const index = (i + 1).toString().padStart(2, "0");
    test(`test/${file}`, async ({ page }) => {
        const start = Date.now();
        await installWebGPUMonitor(page);
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
        const gpu = await settleWebGPUMonitor(page);
        expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
        expect(pageErrors, pageErrors.map((error) => error.stack ?? error.message).join("\n\n")).toEqual([]);
        expect(gpu.errors, gpu.errors.join("\n")).toEqual([]);
        expect(gpu.deviceLosses, gpu.deviceLosses.join("\n")).toEqual([]);
        const stop = Date.now();
        console.log(`${g}[test:${index}:${name}] passed in ${stop - start}ms, devices=${gpu.devices}, submissions=${gpu.submissions}${x}`);
    });
}
