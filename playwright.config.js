/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { defineConfig } from "@playwright/test";
import { expectedTests } from "./test/manifests/suites.js";

if (Object.prototype.hasOwnProperty.call(process.env, "NO_COLOR")) { delete process.env.NO_COLOR; process.env.FORCE_COLOR = "0"; }

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const browserName = process.env.WASMGPU_BROWSER ?? "chromium";
const supportedBrowsers = new Set(["chromium", "firefox", "webkit"]);
if (!supportedBrowsers.has(browserName)) throw new Error(`Unsupported WASMGPU_BROWSER: ${browserName}`);
const requestedProjects = process.argv.flatMap((argument, index, arguments_) => {
    if (argument === "--project") return [arguments_[index + 1]];
    if (argument.startsWith("--project=")) return [argument.slice("--project=".length)];
    return [];
});
const lifecycleSuites = new Map([
    ["test:setup", "setup"],
    ["test:js", "javascript"],
    ["test:js:headed", "javascript"],
    ["test:js:debug", "javascript"],
    ["test:ex", "examples"]
]);
const reportSuite = lifecycleSuites.get(process.env.npm_lifecycle_event) ?? (requestedProjects.length === 1 && requestedProjects[0] === "setup" ? "setup" : requestedProjects.includes("examples") && !requestedProjects.includes("runner") ? "examples" : requestedProjects.length ? "javascript" : "all");
const launchOptions = {};
if (browserName === "chromium") {
    const args = [
        "--enable-unsafe-webgpu",
        "--disable-dawn-features=use_dxc",
        "--use-gpu-in-tests",
        "--enable-accelerated-2d-canvas"
    ];
    if (process.platform === "linux") args.push(
        "--enable-features=Vulkan",
        "--use-angle=vulkan",
        "--use-vulkan=native"
    );
    else args.push(
        "--use-webgpu-adapter=swiftshader"
    );
    launchOptions.args = args;
} else if (browserName === "firefox") launchOptions.firefoxUserPrefs = {
    "dom.webgpu.enabled": true,
    "gfx.webgpu.ignore-blocklist": true
};

export default defineConfig({
    testDir: "./test/manifests",
    testMatch: "**/*.spec.js",
    fullyParallel: false,
    workers: 1,
    timeout: 120_000,
    expect: { timeout: 5_000 },
    retries: process.env.CI ? 1 : 0,
    retryStrategy: "isolated",
    reporter: [
        ["line"],
        ["html", { open: "never", outputFolder: `./playwright-report/${reportSuite}` }],
        ["blob", { outputDir: `./blob-report/${reportSuite}` }],
        ["./scripts/merge-test-reports.js", { expectedTests: expectedTests[reportSuite], outputFile: `./blob-report/${reportSuite}/run.json`, suite: reportSuite }]
    ],
    outputDir: `./test-results/${reportSuite}`,
    projects: [
        { name: "setup", testMatch: "setup.spec.js" },
        { name: "runner", testMatch: "runner.spec.js" },
        { name: "examples", testMatch: "examples.spec.js" }
    ],
    use: {
        baseURL: BASE_URL,
        browserName,
        ...(browserName === "chromium" ? { channel: "chromium" } : {}),
        headless: true,
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        launchOptions
    },
    webServer: {
        command: `node ./scripts/serve-tests.js --port ${PORT}`,
        gracefulShutdown: { signal: "SIGTERM", timeout: 500 },
        url: `${BASE_URL}/test/index.html`,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
        stdout: "ignore",
        stderr: "pipe"
    }
});
