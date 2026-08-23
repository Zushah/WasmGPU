/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeU32 } from "../harness/data.js";

export default {
    name: "kernels-scan-exclusive-u32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state ComputeKernels.scanExclusiveU32 multi-pass throughput excluding readback and including GPU completion.",
    sizes: { quick: [65_536, 1_048_576], full: [65_536, 1_048_576, 8_388_608] },
    gpu: true,
    setup({ compute }, size) {
        return {
            input: compute.createStorageBuffer({ data: makeU32(size) }),
            output: compute.createStorageBuffer({ byteLength: size * 4 })
        };
    },
    run(state, { compute }) {
        compute.kernels.scanExclusiveU32(state.input, { out: state.output });
    },
    operations(size) { return size; },
    workload(size) { return { elements: size }; },
    teardown(state) { state.input.destroy(); state.output.destroy(); }
};
