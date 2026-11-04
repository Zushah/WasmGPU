/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "ndarray-resize-gpu-tricubic-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state compute.ndarray.resize tricubic 2x upsampling of an f32 GPU cube along all three axes into a caller-provided output, including per-call tap tables in parameter buffers, the pass planner's separable passes through scratch temporaries (which it chooses for this workload), submission, and GPU completion.",
    sizes: { quick: [32, 64], full: [32, 64, 128] },
    gpu: true,
    setup({ compute }, size) {
        return {
            source: compute.ndarray.fromArray("f32", [size, size, size], makeF32(size * size * size), { residency: "gpu" }),
            out: compute.ndarray.empty("f32", { shape: [2 * size, 2 * size, 2 * size] }, { residency: "gpu" })
        };
    },
    run(state, { compute }, size) {
        compute.ndarray.resize(state.source, { axes: [0, 1, 2], size: [2 * size, 2 * size, 2 * size], method: "cubic", out: state.out });
    },
    operations(size) { return 8 * size * size * size; },
    workload(size) { return { inputSide: size, outputSide: 2 * size, outputElements: 8 * size * size * size }; },
    teardown(state) { state.out.destroy(); state.source.destroy(); }
};
