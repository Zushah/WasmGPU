/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "ndarray-normalize-gpu-zscore-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state compute.ndarray.normalize with method \"zscore\" of every row of a square f32 GPU image into a caller-provided output, including the fused min-max and two-pass std-mean reductions, the z-score parameter pass, the affine pass, per-call parameters, submission, and GPU completion.",
    sizes: { quick: [256, 1_024], full: [256, 1_024, 4_096] },
    gpu: true,
    setup({ compute }, size) {
        return {
            source: compute.ndarray.fromArray("f32", [size, size], makeF32(size * size), { residency: "gpu" }),
            out: compute.ndarray.empty("f32", { shape: [size, size] }, { residency: "gpu" })
        };
    },
    run(state, { compute }) {
        compute.ndarray.normalize(state.source, { method: "zscore", axes: 1, out: state.out });
    },
    operations(size) { return size * size; },
    workload(size) { return { side: size, reducedElements: size, outputs: size * size }; },
    teardown(state) { state.out.destroy(); state.source.destroy(); }
};
