/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { defineConfig } from "@playwright/test";

if (Object.prototype.hasOwnProperty.call(process.env, "NO_COLOR")) {
    delete process.env.NO_COLOR;
    process.env.FORCE_COLOR = "0";
}

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const launchArgs = [
    "--enable-unsafe-webgpu",
    "--disable-dawn-features=use_dxc",
    "--use-gpu-in-tests",
    "--enable-accelerated-2d-canvas"
];
if (process.platform === "linux") launchArgs.push(
    "--enable-features=Vulkan",
    "--use-angle=vulkan",
    "--use-vulkan=native"
);
else launchArgs.push("--use-webgpu-adapter=swiftshader");

export default defineConfig({
    testDir: "./test",
    testMatch: "runner.spec.js",
    fullyParallel: false,
    workers: 1,
    timeout: 120_000,
    expect: { timeout: 5_000 },
    retries: process.env.CI ? 1 : 0,
    retryStrategy: "isolated",
    reporter: [["line"], ["html", { open: "never" }]],
    outputDir: "./test-results",
    use: {
        baseURL: BASE_URL,
        channel: "chromium",
        headless: true,
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        launchOptions: {
            args: launchArgs
        }
    },
    webServer: {
        command: `node ./scripts/run-tests.js --port ${PORT}`,
        url: `${BASE_URL}/test/index.html`,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
        stdout: "ignore",
        stderr: "pipe"
    }
});
