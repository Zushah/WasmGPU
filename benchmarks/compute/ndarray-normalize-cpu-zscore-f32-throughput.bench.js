/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "ndarray-normalize-cpu-zscore-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state compute.ndarray.normalize with method \"zscore\" of every row of a square f32 CPU image, including the fused min-max and canonical-order f64 std-mean reductions, the affine pass, per-call heap descriptors, and owned output and statistics allocation.",
    sizes: { quick: [256, 1_024], full: [256, 1_024, 4_096] },
    gpu: false,
    setup({ compute }, size) {
        return { source: compute.ndarray.fromArray("f32", [size, size], makeF32(size * size)) };
    },
    run(state, { compute }) {
        compute.ndarray.normalize(state.source, { method: "zscore", axes: 1 }).destroy();
    },
    operations(size) { return size * size; },
    workload(size) { return { side: size, reducedElements: size, outputs: size * size }; },
    teardown(state) { state.source.destroy(); }
};
