/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "kernels-copy-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "GB/s",
    description: "Steady-state ComputeKernels.copyF32 throughput including command submission and GPU completion.",
    sizes: { quick: [65_536, 1_048_576], full: [65_536, 1_048_576, 8_388_608] },
    gpu: true,
    setup({ compute }, size) {
        return {
            input: compute.createStorageBuffer({ data: makeF32(size) }),
            output: compute.createStorageBuffer({ byteLength: size * 4 })
        };
    },
    run(state, { compute }, size) {
        compute.kernels.copyF32(state.input, { out: state.output, count: size });
    },
    operations(size) { return size * 4 / 1e9; },
    workload(size) { return { elements: size, bytes: size * 4 }; },
    teardown(state) { state.input.destroy(); state.output.destroy(); }
};
