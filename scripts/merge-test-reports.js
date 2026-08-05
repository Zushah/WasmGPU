/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expectedTests } from "../test/manifests/suites.js";

const ROOT = resolve(fileURLToPath(new URL("../", import.meta.url)));
const REPORT_DIR = join(ROOT, "blob-report");
const COMBINED_REPORT = join(ROOT, "playwright-report", "combined");
const suites = ["setup", "javascript", "examples"];

export default class TestReporter {
    constructor(options) {
        this.completedTests = new Set();
        this.expectedTests = options.expectedTests;
        this.outputFile = resolve(options.outputFile);
        this.suite = options.suite;
        this.totalTests = 0;
    }

    onBegin(_config, suite) {
        this.totalTests = suite.allTests().length;
    }

    onTestEnd(test) {
        this.completedTests.add(test.id);
    }

    onEnd(result) {
        mkdirSync(dirname(this.outputFile), { recursive: true });
        writeFileSync(this.outputFile, `${JSON.stringify({ completedTests: this.completedTests.size, expectedTests: this.expectedTests, status: result.status, suite: this.suite, totalTests: this.totalTests })}\n`);
    }
}

const cleanReports = () => {
    for (const suite of suites) {
        rmSync(join(ROOT, "blob-report", suite), { force: true, recursive: true });
        rmSync(join(ROOT, "playwright-report", suite), { force: true, recursive: true });
        rmSync(join(ROOT, "test-results", suite), { force: true, recursive: true });
    }
    rmSync(COMBINED_REPORT, { force: true, recursive: true });
};

const mergeReports = () => {
    const mergeDir = mkdtempSync(join(tmpdir(), "wasmgpu-playwright-"));
    try {
        for (const suite of suites) {
            const suiteDir = join(REPORT_DIR, suite);
            const reports = readdirSync(suiteDir).filter((file) => file.endsWith(".zip"));
            if (reports.length !== 1) throw new Error(`Expected one ${suite} Playwright blob report in ${suiteDir}, found ${reports.length}.`);
            const run = JSON.parse(readFileSync(join(suiteDir, "run.json"), "utf8"));
            if (run.suite !== suite || run.expectedTests !== expectedTests[suite] || run.totalTests !== expectedTests[suite] || run.completedTests !== expectedTests[suite]) throw new Error(`The ${suite} Playwright report is incomplete or was produced by a filtered run: ${JSON.stringify(run)}.`);
            copyFileSync(join(suiteDir, reports[0]), join(mergeDir, `${suite}-${basename(reports[0])}`));
        }
        const cli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
        const env = { ...process.env, PLAYWRIGHT_HTML_OPEN: "never", PLAYWRIGHT_HTML_OUTPUT_DIR: COMBINED_REPORT };
        const result = spawnSync(process.execPath, [cli, "merge-reports", "--reporter=html", mergeDir], { cwd: ROOT, env, stdio: "inherit" });
        if (result.error) throw result.error;
        if (result.status !== 0) process.exitCode = result.status ?? 1;
        else console.log(`Combined report: ${join(COMBINED_REPORT, "index.html")}`);
    } finally {
        rmSync(mergeDir, { force: true, recursive: true });
    }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    if (process.argv.includes("--clean")) cleanReports();
    else mergeReports();
}
