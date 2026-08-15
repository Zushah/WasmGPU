/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { expect, test } from "@playwright/test";
import { colors, installWebGPUMonitor, settleWebGPUMonitor } from "../utils/helpers.js";
import { testFiles } from "./suites.js";

const { r, g, y, x } = colors;
const firefoxIntentionalTeardownErrors = new Set(["Buffer with '' label has been destroyed"]);

for (let i = 0; i < testFiles.length; ++i) {
    const file = testFiles[i];
    const name = file.replace(/\.test\.js$/, "");
    const index = (i + 1).toString().padStart(2, "0");
    test(`tests/${file}`, async ({ browserName, page }) => {
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
        await page.goto("/tests/index.html");
        await page.evaluate(async (moduleUrl) => { await import(moduleUrl); }, `/tests/${file}`);
        const gpu = await settleWebGPUMonitor(page);
        const intentionalTeardownErrors = browserName === "firefox" ? gpu.intentionalTeardownErrors.filter((error) => !firefoxIntentionalTeardownErrors.has(error)) : gpu.intentionalTeardownErrors;
        const gpuErrors = [...gpu.errors, ...intentionalTeardownErrors];
        expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
        expect(pageErrors, pageErrors.map((error) => error.stack ?? error.message).join("\n\n")).toEqual([]);
        expect(gpuErrors, gpuErrors.join("\n")).toEqual([]);
        expect(gpu.deviceLosses, gpu.deviceLosses.join("\n")).toEqual([]);
        const stop = Date.now();
        console.log(`${g}[test:${index}:${name}] passed in ${stop - start}ms, devices=${gpu.devices}, submissions=${gpu.submissions}${x}`);
    });
}
