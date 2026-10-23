/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "ndarray-resize-gpu-linear-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state compute.ndarray.resize linear 2x upsampling of a square f32 GPU image into a caller-provided output, including tap tables in per-call parameter buffers, submission, and GPU completion.",
    sizes: { quick: [256, 512], full: [256, 512, 1_024] },
    gpu: true,
    setup({ compute }, size) {
        return {
            source: compute.ndarray.fromArray("f32", [size, size], makeF32(size * size), { residency: "gpu" }),
            out: compute.ndarray.empty("f32", { shape: [2 * size, 2 * size] }, { residency: "gpu" })
        };
    },
    run(state, { compute }, size) {
        compute.ndarray.resize(state.source, { axes: [0, 1], size: [2 * size, 2 * size], out: state.out });
    },
    operations(size) { return 4 * size * size; },
    workload(size) { return { inputSide: size, outputSide: 2 * size, outputElements: 4 * size * size }; },
    teardown(state) { state.out.destroy(); state.source.destroy(); }
};
