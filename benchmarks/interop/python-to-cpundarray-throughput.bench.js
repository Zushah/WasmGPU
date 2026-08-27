/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "python-to-cpundarray-throughput",
    subsystem: "interop",
    type: "throughput",
    unit: "bytes/s",
    description: "Resolved Pyodide-like float32 buffer import into a canonical CPUndarray.",
    sizes: { quick: [1_048_576, 4_194_304], full: [1_048_576, 4_194_304, 16_777_216] },
    gpu: false,
    setup({ WasmGPU, compute }, size) {
        return {
            python: new WasmGPU.PythonInterop(compute),
            source: { data: new Float32Array(size), shape: [size], strides: [1], offset: 0, c_contiguous: true },
            result: null
        };
    },
    run(state) {
        state.result?.destroy();
        state.result = state.python.toCPU(state.source);
    },
    afterSample(state) { state.result?.destroy(); state.result = null; },
    operations(size) { return size * 4; },
    workload(size) { return { elements: size, bytesCopied: size * 4, cpuArraysCreatedPerRun: 1 }; },
    teardown(state) { state.result?.destroy(); }
};
