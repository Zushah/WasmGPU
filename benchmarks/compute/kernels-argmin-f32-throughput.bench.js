/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "kernels-argmin-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state ComputeKernels.argminF32 pair-reduction throughput excluding readback and including GPU completion.",
    sizes: { quick: [65_536, 1_048_576], full: [65_536, 1_048_576, 8_388_608] },
    gpu: true,
    setup({ compute }, size) {
        return {
            input: compute.createStorageBuffer({ data: makeF32(size) }),
            output: compute.createStorageBuffer({ byteLength: 8 })
        };
    },
    run(state, { compute }) {
        compute.kernels.argminF32(state.input, { out: state.output });
    },
    operations(size) { return size; },
    workload(size) { return { elements: size, resultBytes: 8 }; },
    teardown(state) { state.input.destroy(); state.output.destroy(); }
};
