/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeU32 } from "../harness/data.js";

export default {
    name: "kernels-compact-u32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Complete ComputeKernels.compact u32 throughput at 50% keep density with a GPU-resident count, excluding readback and including GPU completion.",
    sizes: { quick: [4_194_304, 8_388_608], full: [8_388_608, 12_582_912, 16_777_216] },
    gpu: true,
    maximumRepetitions: 32,
    setup({ compute }, size) {
        const flags = new Uint32Array(size);
        for (let i = 0; i < size; i++) flags[i] = i & 1;
        return {
            input: compute.ndarray.fromArray("u32", [size], makeU32(size), { residency: "gpu" }),
            flags: compute.ndarray.fromArray("u32", [size], flags, { residency: "gpu" }),
            output: compute.ndarray.empty("u32", { shape: [size] }, { residency: "gpu" }),
            count: compute.ndarray.empty("u32", { shape: [] }, { residency: "gpu" })
        };
    },
    run(state, { compute }) {
        compute.kernels.compact(state.input, state.flags, { out: state.output, outCount: state.count });
    },
    operations(size) { return size; },
    workload(size) { return { elements: size, keepDensity: 0.5 }; },
    teardown(state) { state.input.destroy(); state.flags.destroy(); state.output.destroy(); state.count.destroy(); }
};
