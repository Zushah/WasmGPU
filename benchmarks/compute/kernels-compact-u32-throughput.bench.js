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
    description: "Complete ComputeKernels.compactU32 throughput at 50% keep density, excluding readback and including GPU completion.",
    sizes: { quick: [4_194_304, 8_388_608], full: [8_388_608, 12_582_912, 16_776_960] },
    gpu: true,
    maximumRepetitions: 32,
    setup({ compute }, size) {
        const flags = new Uint32Array(size);
        for (let i = 0; i < size; i++) flags[i] = i & 1;
        return {
            input: compute.createStorageBuffer({ data: makeU32(size) }),
            flags: compute.createStorageBuffer({ data: flags }),
            output: compute.createStorageBuffer({ byteLength: size * 4 }),
            counts: []
        };
    },
    run(state, { compute }) {
        const result = compute.kernels.compactU32(state.input, state.flags, { out: state.output });
        state.counts.push(result.count);
    },
    afterSample(state) { for (const count of state.counts) count.destroy(); state.counts.length = 0; },
    operations(size) { return size; },
    workload(size) { return { elements: size, keepDensity: 0.5, maximumBatchedCountBuffers: 32 }; },
    teardown(state) { for (const count of state.counts) count.destroy(); state.input.destroy(); state.flags.destroy(); state.output.destroy(); }
};
