/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "python-copyinto-gpundarray-view-throughput",
    subsystem: "interop",
    type: "throughput",
    unit: "bytes/s",
    description: "PythonInterop.copyInto of a C-ordered float32 buffer into a strided GPUndarray slice view (staged upload plus WGSL gather), including queue completion.",
    sizes: { quick: [1_048_576, 4_194_304], full: [1_048_576, 4_194_304, 16_777_216] },
    gpu: true,
    setup({ WasmGPU, compute }, size) {
        const cols = 1024, rows = size / cols;
        const root = compute.ndarray.zeros("f32", { shape: [rows, cols * 2] }, { residency: "gpu" });
        return {
            python: new WasmGPU.PythonInterop(compute),
            root,
            view: compute.ndarray.slice(root, ":, ::2"),
            source: { data: new Float32Array(size), shape: [rows, cols], strides: [cols, 1], offset: 0, c_contiguous: true }
        };
    },
    run(state) {
        state.python.copyInto(state.view, state.source);
    },
    operations(size) { return size * 4; },
    workload(size) { return { elements: size, bytesUploaded: size * 4, destination: "slice(':, ::2')", destinationAllocationsPerRun: 0 }; },
    teardown(state) { state.root.destroy(); }
};
