/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "cpundarray-upload-to-gpu-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "bytes/s",
    description: "Single-call CPUndarray.uploadToGPU allocation and CPU-Wasm-to-GPU upload throughput; returned GPU storage is destroyed after each sample.",
    sizes: { quick: [4_194_304, 16_777_216], full: [4_194_304, 16_777_216, 33_554_432] },
    warmup: { quick: 10, full: 10 },
    gpu: false,
    maximumRepetitions: 1,
    setup({ compute }, size) {
        return {
            source: compute.CPUndarray.fromArray("f32", [size], makeF32(size)),
            result: null
        };
    },
    run(state, { compute }) {
        state.result = state.source.uploadToGPU(compute);
    },
    async afterSample(state) { state.result?.destroy(); state.result = null; await new Promise(resolve => setTimeout(resolve, 0)); },
    operations(size) { return size * 4; },
    workload(size) { return { elements: size, bytesUploaded: size * 4, gpuArraysCreatedPerRun: 1, maximumSimultaneousResults: 1 }; },
    teardown(state) { state.result?.destroy(); state.source.destroy(); }
};
