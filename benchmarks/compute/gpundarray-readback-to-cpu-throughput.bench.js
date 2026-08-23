/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "gpundarray-readback-to-cpu-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "bytes/s",
    description: "GPUndarray.readbackToCPU complete GPU-to-Wasm transfer throughput with returned CPU storage destroyed after each sample.",
    sizes: { quick: [4_194_304, 8_388_608], full: [16_777_216, 25_165_824, 33_554_432] },
    gpu: false,
    maximumRepetitions: 1,
    setup({ compute }, size) {
        const source = compute.CPUndarray.fromArray("f32", [size], makeF32(size));
        const gpu = source.uploadToGPU(compute, { copySrc: true });
        source.destroy();
        return { gpu, result: null };
    },
    async run(state) {
        state.result = await state.gpu.readbackToCPU();
    },
    afterSample(state) { state.result?.destroy(); state.result = null; },
    operations(size) { return size * 4; },
    workload(size) { return { elements: size, bytesRead: size * 4, cpuArraysCreatedPerRun: 1, maximumSimultaneousResults: 1 }; },
    teardown(state) { state.result?.destroy(); state.gpu.destroy(); }
};
