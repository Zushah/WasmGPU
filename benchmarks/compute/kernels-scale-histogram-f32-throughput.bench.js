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
    description: "Complete ComputeKernels.scaleHistogram throughput with finite range, bin clearing, and GPU completion.",
    sizes: { quick: [65_536, 1_048_576], full: [65_536, 1_048_576, 8_388_608, 16_777_216] },
    gpu: true,
    setup({ compute }, size) {
        return {
            input: compute.ndarray.fromArray("f32", [size], makeF32(size), { residency: "gpu" }),
            bins: compute.ndarray.empty("u32", { shape: [BIN_COUNT] }, { residency: "gpu" })
        };
    },
    run(state, { compute }) {
        compute.kernels.scaleHistogram(state.input, { bins: BIN_COUNT, out: state.bins, clear: true, minValue: 0, maxValue: 1 });
    },
    operations(size) { return size; },
    workload(size) { return { elements: size, bins: BIN_COUNT, range: [0, 1] }; },
    teardown(state) { state.input.destroy(); state.bins.destroy(); }
};
