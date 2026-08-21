/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { controllerMetadata, createBenchmarkPage, launchBenchmarkBrowser } from "./browser-launcher.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MACHINE_PATH = resolve(ROOT, "benchmarks/machine.local.json");
const validSubsystems = new Set(["math", "objects", "compute", "scaling", "gltf", "interop", "render", "interact"]);
const args = process.argv.slice(2);
const unknown = args.filter((arg) => arg.startsWith("--") && arg !== "--full" && arg !== "--tracked" && arg !== "--allow-fallback" && arg !== "--linux-browser" && !arg.startsWith("--subsystem=") && !arg.startsWith("--windows-browser="));
if (unknown.length) throw new Error(`Unknown benchmark option: ${unknown[0]}. Supported options are --full, --tracked, --allow-fallback, --linux-browser, --windows-browser=<path>, and --subsystem=<name>.`);
const mode = args.includes("--full") ? "full" : "quick";
const tracked = args.includes("--tracked");
const allowFallback = args.includes("--allow-fallback");
const linuxBrowser = args.includes("--linux-browser");
const windowsBrowserArguments = args.filter((arg) => arg.startsWith("--windows-browser=")).map((arg) => arg.slice("--windows-browser=".length));
if (windowsBrowserArguments.length > 1) throw new Error("--windows-browser may be specified only once.");
const windowsBrowser = windowsBrowserArguments[0];
if (tracked && allowFallback) throw new Error("--tracked cannot be combined with --allow-fallback. Archival reports require a native hardware WebGPU adapter.");
const requested = args.filter((arg) => arg.startsWith("--subsystem=")).map((arg) => arg.slice(12));
if (requested.some((name) => !validSubsystems.has(name))) throw new Error(`Unknown benchmark subsystem: ${requested.find((name) => !validSubsystems.has(name))}`);
if (!existsSync(MACHINE_PATH)) throw new Error("Missing benchmarks/machine.local.json. Copy benchmarks/machine.example.json and fill in every field before benchmarking.");
const machine = JSON.parse(readFileSync(MACHINE_PATH, "utf8"));
for (const field of ["label", "hostOS", "environment", "cpu", "gpu", "ram", "storage"]) if (typeof machine[field] !== "string" || !machine[field].trim()) throw new Error(`benchmarks/machine.local.json is incomplete: '${field}' must be a non-empty string.`);
if (!existsSync(resolve(ROOT, "release/WasmGPU.js"))) throw new Error("Missing release/WasmGPU.js. Run 'npm run build' before benchmarking.");

const stamp = new Date();
const date = stamp.toLocaleDateString("en-CA");
const time = stamp.toLocaleTimeString("en-GB", { hour12: false }).replaceAll(":", "-");
const runDir = resolve(ROOT, "benchmarks/reports", date, time);
const suffix = tracked ? "" : ".local";
const port = 4280 + Math.floor(Math.random() * 500);
const server = spawn(process.execPath, [resolve(ROOT, "scripts/serve-tests.js"), "--port", String(port)], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
const serverReady = new Promise((resolveReady, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out starting benchmark server.")), 30_000);
    server.stdout.on("data", (chunk) => { if (String(chunk).includes("http://")) { clearTimeout(timer); resolveReady(); } });
    server.stderr.on("data", (chunk) => process.stderr.write(chunk));
    server.on("exit", (code) => reject(new Error(`Benchmark server exited early (${code}).`)));
});

let browserSession;
try {
    await serverReady;
    browserSession = await launchBenchmarkBrowser({ linuxBrowser, windowsBrowser });
    const page = await createBenchmarkPage(browserSession);
    const canUseColor = process.env.FORCE_COLOR !== "0" && (process.stdout.isTTY || !process.env.NO_COLOR), green = canUseColor ? "\x1b[32m" : "", reset = canUseColor ? "\x1b[0m" : "";
    await page.exposeFunction("__wasmgpuBenchmarkProgress", ({ index, subsystem, name, elapsedMilliseconds, devices, submissions }) => {
        console.log(`${green}[bench:${String(index).padStart(2, "0")}:${subsystem}/${name}] done in ${(elapsedMilliseconds / 1_000).toFixed(2)}s, devices=${devices}, submissions=${submissions}${reset}`);
    });
    await page.goto(`http://127.0.0.1:${port}/benchmarks/harness/index.html`);
    const selected = requested.length ? requested : [...validSubsystems];
    const output = await page.evaluate(async ({ mode, selected, allowFallback }) => {
        const manifest = await import("/benchmarks/manifest.js");
        const harness = await import("/benchmarks/harness/browser.js");
        return harness.runBenchmarks({
            definitions: manifest.benchmarks.filter((item) => selected.includes(item.subsystem)),
            mode, allowFallback, onProgress: (progress) => globalThis.__wasmgpuBenchmarkProgress(progress)
        });
    }, { mode, selected, allowFallback });
    if (tracked && !output.runtime.adapter.isNativeAdapter) throw new Error("Tracked reports require a native hardware WebGPU adapter; the selected adapter is software/fallback.");
    mkdirSync(runDir, { recursive: true });
    const manifest = {
        schemaVersion: 1,
        timestamp: stamp.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        mode,
        subsystems: selected,
        tracked,
        machine,
        node: process.version,
        controller: controllerMetadata(),
        browser: { ...browserSession.metadata, version: browserSession.browser.version() },
        ...output.runtime
    };
    writeFileSync(resolve(runDir, `run${suffix}.json`), `${JSON.stringify(manifest)}\n`);
    for (const result of output.results) writeFileSync(resolve(runDir, `${result.subsystem}-${result.name}${suffix}.json`), `${JSON.stringify(result)}\n`);
    console.log(`WasmGPU ${mode} benchmarks (${output.results.length} benchmarks)`);
    for (const result of output.results) for (const benchmarkCase of result.cases) console.log(`${result.subsystem}/${result.name} n=${benchmarkCase.size}: ${benchmarkCase.statistics.median.toFixed(3)} ${result.unit}`);
    console.log(`JSON report: ${runDir}`);
    const analysis = spawn("python3", [resolve(ROOT, "benchmarks/analysis/report.py"), runDir], { cwd: ROOT, stdio: "inherit" });
    const analysisCode = await new Promise((resolveCode) => analysis.on("exit", resolveCode));
    if (analysisCode !== 0) console.warn("Benchmark JSON is complete, but Python summary/plot generation failed. Run 'python -m pip install numpy matplotlib' and run 'python benchmarks/analysis/report.py benchmarks/reports/YYYY-MM-DD/HH-MM-SS'.");
} finally { try { await browserSession?.close(); } finally { server.kill("SIGTERM"); } }
