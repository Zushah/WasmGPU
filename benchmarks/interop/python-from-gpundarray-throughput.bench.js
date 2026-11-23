/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "python-from-gpundarray-throughput",
    subsystem: "interop",
    type: "throughput",
    unit: "bytes/s",
    description: "PythonInterop.copyOut complete GPU-to-Pyodide-like buffer export (synchronous snapshot submission, map, and one copy into the destination).",
    sizes: { quick: [4_194_304, 8_388_608], full: [16_777_216, 25_165_824, 33_554_432] },
    gpu: false,
    maximumRepetitions: 1,
    setup({ WasmGPU, compute }, size) {
        const source = compute.ndarray.fromArray("f32", [size], makeF32(size));
        const gpu = compute.ndarray.toGPU(source);
        source.destroy();
        return {
            python: new WasmGPU.PythonInterop(compute),
            gpu,
            destination: { data: new Float32Array(size), shape: [size], strides: [1], offset: 0, c_contiguous: true }
        };
    },
    async run(state) {
        await state.python.copyOut(state.destination, state.gpu);
    },
    operations(size) { return size * 4; },
    workload(size) { return { elements: size, bytesRead: size * 4, destinationAllocationsPerRun: 0 }; },
    teardown(state) { state.gpu.destroy(); }
};
