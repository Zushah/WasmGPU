/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "ndarray-resize-cpu-linear-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "WebAssembly compute.ndarray.resize linear 2x upsampling of a square f32 CPU image in f64 arithmetic, including output allocation and destruction.",
    sizes: { quick: [128, 256], full: [128, 256, 512] },
    gpu: false,
    setup({ compute }, size) {
        return { source: compute.ndarray.fromArray("f32", [size, size], makeF32(size * size)) };
    },
    run(state, { compute }, size) {
        compute.ndarray.resize(state.source, { axes: [0, 1], size: [2 * size, 2 * size] }).destroy();
    },
    operations(size) { return 4 * size * size; },
    workload(size) { return { inputSide: size, outputSide: 2 * size, outputElements: 4 * size * size }; },
    teardown(state) { state.source.destroy(); }
};
