/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const examples = [
    { file: "benchmark.html", title: "WasmGPU | Benchmark Example", ready: [".stats", "engine: WasmGPU"] },
    { file: "controls.html", title: "WasmGPU | Controls Example", ready: [".nav", "Controls & Navigation"] },
    { file: "esm.html", title: "WasmGPU | ESM Example" },
    { file: "fluid.html", title: "WasmGPU | Fluid Example", ready: [".info", "grid: 15 x 15 x 11"] },
    { file: "galaxy.html", title: "WasmGPU | Galaxy Example" },
    { file: "gltf.html", title: "WasmGPU | glTF Example" },
    { file: "graphing.html", title: "WasmGPU | Graphing Example", ready: [".status", "rendering cartesian surface"] },
    { file: "iife.html", title: "WasmGPU | IIFE Example" },
    { file: "lego.html", title: "WasmGPU | Lego Example", ready: ["#status", "Imported 1 splatfield glTF asset"], readyTimeout: 300_000, timeout: 360_000 },
    { file: "mandelbulb.html", title: "WasmGPU | Mandelbulb Example" },
    { file: "overlay.html", title: "WasmGPU | Overlay Example", ready: [".nav", "Overlay & Annotation"] },
    { file: "picking.html", title: "WasmGPU | Picking Example", ready: [".nav", "Picking & Selection"] },
    { file: "protein.html", title: "WasmGPU | Protein Example", ready: [".info", "loaded"] },
    { file: "quantum.html", title: "WasmGPU | Quantum Example", ready: [".readout", "orbital: 3d_z²"] },
    { file: "scaling.html", title: "WasmGPU | Scaling Example", ready: ["#scale-status", "status: idle"], interactionTimeout: 120_000, timeout: 180_000 },
    { file: "terrain.html", title: "WasmGPU | Terrain Example", ready: [".hud", "Click terrain to lock pointer"] }
];

export const testFiles = readdirSync(TEST_DIR, { withFileTypes: true }).filter((entry) => entry.isFile() && entry.name.endsWith(".test.js")).map((entry) => entry.name).sort((a, b) => a.localeCompare(b));

export const expectedTests = Object.freeze({ all: 2 + testFiles.length + examples.length, examples: examples.length, javascript: testFiles.length, setup: 2 });
