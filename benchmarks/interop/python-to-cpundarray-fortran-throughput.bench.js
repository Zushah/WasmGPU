/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "python-to-cpundarray-fortran-throughput",
    subsystem: "interop",
    type: "throughput",
    unit: "bytes/s",
    description: "Resolved Pyodide-like F-ordered float32 buffer import into a canonical CPUndarray with the default order=\"K\" (layout-preserving one-copy path).",
    sizes: { quick: [1_048_576, 4_194_304], full: [1_048_576, 4_194_304, 16_777_216] },
    gpu: false,
    setup({ WasmGPU, compute }, size) {
        const rows = 1024, cols = size / rows;
        return {
            python: new WasmGPU.PythonInterop(compute),
            source: { data: new Float32Array(size), shape: [rows, cols], strides: [1, rows], offset: 0, f_contiguous: true, c_contiguous: false },
            result: null
        };
    },
    run(state) {
        state.result?.destroy();
        state.result = state.python.toCPU(state.source);
    },
    afterSample(state) { state.result?.destroy(); state.result = null; },
    operations(size) { return size * 4; },
    workload(size) { return { elements: size, bytesCopied: size * 4, layout: "F", order: "K", cpuArraysCreatedPerRun: 1 }; },
    teardown(state) { state.result?.destroy(); }
};
