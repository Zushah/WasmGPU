/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "ndarray-resize-gpu-cubic-antialias-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state compute.ndarray.resize antialiased cubic 4x downsampling of a square f32 GPU image into a caller-provided output, including per-call tap table construction in parameter buffers, the separable two-pass path when wide filters trigger it, submission, and GPU completion.",
    sizes: { quick: [128, 256], full: [128, 256, 512] },
    gpu: true,
    setup({ compute }, size) {
        const side = 4 * size;
        return {
            source: compute.ndarray.fromArray("f32", [side, side], makeF32(side * side), { residency: "gpu" }),
            out: compute.ndarray.empty("f32", { shape: [size, size] }, { residency: "gpu" })
        };
    },
    run(state, { compute }, size) {
        compute.ndarray.resize(state.source, { axes: [0, 1], size: [size, size], method: "cubic", antialias: true, out: state.out });
    },
    operations(size) { return 16 * size * size; },
    workload(size) { return { inputSide: 4 * size, outputSide: size, inputElements: 16 * size * size }; },
    teardown(state) { state.out.destroy(); state.source.destroy(); }
};
