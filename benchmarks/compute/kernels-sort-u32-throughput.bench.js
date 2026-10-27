/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeU32 } from "../harness/data.js";

export default {
    name: "kernels-sort-u32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "keys/s",
    description: "Steady-state out-of-place ComputeKernels.sort radix throughput including GPU completion.",
    sizes: { quick: [16_384, 262_144], full: [16_384, 262_144, 2_097_152, 16_777_216] },
    gpu: true,
    setup({ compute }, size) {
        return {
            input: compute.ndarray.fromArray("u32", [size], makeU32(size), { residency: "gpu" }),
            output: compute.ndarray.empty("u32", { shape: [size] }, { residency: "gpu" })
        };
    },
    run(state, { compute }) {
        compute.kernels.sort(state.input, { out: state.output });
    },
    operations(size) { return size; },
    workload(size) { return { keys: size }; },
    teardown(state) { state.input.destroy(); state.output.destroy(); }
};
