/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "python-to-gpundarray-strided-throughput",
    subsystem: "interop",
    type: "throughput",
    unit: "bytes/s",
    description: "Resolved Pyodide-like gapped float32 buffer (every other 16-element run of each row) imported into a canonical GPUndarray with order=\"K\", through the materialized path PythonInterop picks, including GPU completion.",
    sizes: { quick: [1_048_576, 4_194_304], full: [1_048_576, 4_194_304, 16_777_216] },
    gpu: true,
    maximumRepetitions: 1,
    setup({ WasmGPU, compute }, size) {
        const run = 16, rows = size / run;
        return {
            python: new WasmGPU.PythonInterop(compute),
            source: { data: new Float32Array(size * 2), shape: [rows, run], strides: [run * 2, 1], offset: 0, c_contiguous: false, f_contiguous: false },
            result: null
        };
    },
    run(state) {
        state.result = state.python.toGPU(state.source);
    },
    async afterSample(state) { state.result?.destroy(); state.result = null; await new Promise((resolve) => setTimeout(resolve, 0)); },
    operations(size) { return size * 4; },
    workload(size) { return { elements: size, logicalBytes: size * 4, extentBytes: (size * 2 - 16) * 4, gapRatio: 2, order: "K", gpuArraysCreatedPerRun: 1 }; },
    teardown(state) { state.result?.destroy(); }
};
