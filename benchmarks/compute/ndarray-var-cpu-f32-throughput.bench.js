/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "ndarray-var-cpu-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state compute.ndarray.var of every row of a square f32 CPU image, including both canonical-order passes, per-call heap descriptors, and owned output allocation.",
    sizes: { quick: [256, 1_024], full: [256, 1_024, 4_096] },
    gpu: false,
    setup({ compute }, size) {
        return { source: compute.ndarray.fromArray("f32", [size, size], makeF32(size * size)) };
    },
    run(state, { compute }) {
        compute.ndarray.var(state.source, { axes: 1 }).destroy();
    },
    operations(size) { return size * size; },
    workload(size) { return { side: size, reducedElements: size, outputs: size }; },
    teardown(state) { state.source.destroy(); }
};
