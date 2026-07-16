/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { existsSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const TEST_DIR = resolve(ROOT, "test");

const toDisplayPath = (file) => relative(ROOT, file).replaceAll("\\", "/");

const resolveTestFiles = () => {
    if (process.argv.length > 2) return process.argv.slice(2).map((file) => resolve(ROOT, file)).sort((a, b) => toDisplayPath(a).localeCompare(toDisplayPath(b)));
    return readdirSync(TEST_DIR, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".test.js")).map((entry) => resolve(TEST_DIR, entry.name)).sort((a, b) => toDisplayPath(a).localeCompare(toDisplayPath(b)));
};

const buildEnv = () => {
    const env = { ...process.env };
    if (env.CI && process.platform === "linux") {
        env.LIBGL_ALWAYS_SOFTWARE ??= "1";
        env.WGPU_BACKEND ??= "vulkan";
        const lavapipeIcd = "/usr/share/vulkan/icd.d/lvp_icd.x86_64.json";
        if (existsSync(lavapipeIcd)) { env.VK_ICD_FILENAMES ??= lavapipeIcd; env.VK_DRIVER_FILES ??= lavapipeIcd; }
    }
    return env;
};

const NATIVE_CRASH_RETRIES = 3;
const isNativeCrash = (result) => result.signal === "SIGSEGV" || result.status === 139 || result.signal === "SIGABRT" || result.status === 134;
const DAWN_LIMIT_WARNING = /Warning: maxDynamic(?:Uniform|Storage)BuffersPerPipelineLayout artificially reduced from \d+ to \d+ to fit dynamic offset allocation limit\.\r?\n?/g;

const forwardStderr = (stderr) => { if (!stderr) return; const filtered = stderr.replace(DAWN_LIMIT_WARNING, ""); if (filtered) process.stderr.write(filtered); };

const runOne = (file, env, attempt) => {
    const display = toDisplayPath(file);
    const suffix = attempt > 1 ? ` (retry ${attempt - 1})` : "";
    console.log(`\n[test] ${display}${suffix}`);
    const result = spawnSync(process.execPath, [file], { cwd: ROOT, env, stdio: process.env.CI ? ["inherit", "inherit", "pipe"] : "inherit", encoding: "utf8", });
    if (process.env.CI) forwardStderr(result.stderr);
    return result;
};

const runWithRetry = (file, env) => {
    let result = runOne(file, env, 1);
    if (result.error) { console.error(`[test] failed to start ${toDisplayPath(file)}: ${result.error.message}`); return result; }
    for (let retry = 1; process.env.CI && retry <= NATIVE_CRASH_RETRIES && isNativeCrash(result); retry++) {
        console.warn(`[test] ${toDisplayPath(file)} crashed with ${result.signal ?? `exit ${result.status}`}; retrying (${retry}/${NATIVE_CRASH_RETRIES}) because CI native WebGPU crashes can be intermittent.`);
        result = runOne(file, env, retry + 1);
        if (result.error) { console.error(`[test] failed to start retry for ${toDisplayPath(file)}: ${result.error.message}`); return result; }
    }
    return result;
};

const files = resolveTestFiles();
if (files.length === 0) { console.error("[test] no test files found."); process.exit(1); }

const env = buildEnv();
const started = Date.now();

for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!existsSync(file)) { console.error(`[test] file not found: ${toDisplayPath(file)}`); process.exit(1); }
    const result = runWithRetry(file, env);
    if (result.error) process.exit(1);
    if (result.signal) { console.error(`[test] ${toDisplayPath(file)} failed with signal ${result.signal}.`); process.exit(1); }
    if (result.status !== 0) { console.error(`[test] ${toDisplayPath(file)} failed with exit code ${result.status}.`); process.exit(result.status ?? 1); }
}

const elapsed = Date.now() - started;
console.log(`\n[test] passed ${files.length} tests in ${elapsed}ms.`);
