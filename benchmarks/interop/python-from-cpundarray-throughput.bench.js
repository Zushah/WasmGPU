/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "python-from-cpundarray-throughput",
    subsystem: "interop",
    type: "throughput",
    unit: "bytes/s",
    description: "PythonInterop.copyOut from a canonical float32 CPUndarray into a writable resolved Pyodide-like buffer with the same layout.",
    sizes: { quick: [1_048_576, 4_194_304], full: [1_048_576, 4_194_304, 16_777_216] },
    gpu: false,
    setup({ WasmGPU, compute }, size) {
        const source = WasmGPU.CPUndarray.empty("f32", { shape: [size] });
        source.data().fill(1.5);
        return {
            python: new WasmGPU.PythonInterop(compute),
            source,
            destination: { data: new Float32Array(size), shape: [size], strides: [1], offset: 0, c_contiguous: true }
        };
    },
    run(state) {
        state.python.copyOut(state.destination, state.source);
    },
    operations(size) { return size * 4; },
    workload(size) { return { elements: size, bytesCopied: size * 4, destinationAllocationsPerRun: 0 }; },
    teardown(state) { state.source.destroy(); }
};
