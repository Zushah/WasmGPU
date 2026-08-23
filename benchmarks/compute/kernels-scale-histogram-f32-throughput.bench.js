/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";
const BIN_COUNT = 256;

export default {
    name: "kernels-scale-histogram-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Complete ComputeKernels.histogramF32 throughput with finite range, bin clearing, and GPU completion.",
    sizes: { quick: [65_536, 1_048_576], full: [65_536, 1_048_576, 8_388_608] },
    gpu: true,
    setup({ compute }, size) {
        return {
            input: compute.createStorageBuffer({ data: makeF32(size) }),
            bins: compute.createStorageBuffer({ byteLength: BIN_COUNT * 4 })
        };
    },
    run(state, { compute }) {
        compute.kernels.histogramF32(state.input, BIN_COUNT, { bins: state.bins, clear: true, minValue: 0, maxValue: 1 });
    },
    operations(size) { return size; },
    workload(size) { return { elements: size, bins: BIN_COUNT, range: [0, 1] }; },
    teardown(state) { state.input.destroy(); state.bins.destroy(); }
};
