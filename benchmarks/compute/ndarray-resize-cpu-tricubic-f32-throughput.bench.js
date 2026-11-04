/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "ndarray-resize-cpu-tricubic-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "WebAssembly compute.ndarray.resize tricubic 2x upsampling of an f32 CPU cube along all three axes in f64 arithmetic, including per-call tap table construction, the pass planner's separable passes through f64 intermediates (which it chooses for this workload), and output allocation and destruction.",
    sizes: { quick: [16, 32], full: [16, 32, 64] },
    gpu: false,
    setup({ compute }, size) {
        return { source: compute.ndarray.fromArray("f32", [size, size, size], makeF32(size * size * size)) };
    },
    run(state, { compute }, size) {
        compute.ndarray.resize(state.source, { axes: [0, 1, 2], size: [2 * size, 2 * size, 2 * size], method: "cubic" }).destroy();
    },
    operations(size) { return 8 * size * size * size; },
    workload(size) { return { inputSide: size, outputSide: 2 * size, outputElements: 8 * size * size * size }; },
    teardown(state) { state.source.destroy(); }
};
