/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "kernels-scale-extract-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state ComputeKernels.extractScaleValuesF32 component extraction excluding readback and including GPU completion.",
    sizes: { quick: [65_536, 1_048_576], full: [65_536, 1_048_576, 8_388_608] },
    gpu: true,
    setup({ compute }, size) {
        return {
            input: compute.createStorageBuffer({ data: makeF32(size * 4) }),
            values: compute.createStorageBuffer({ byteLength: size * 4 }),
            flags: compute.createStorageBuffer({ byteLength: size * 4 })
        };
    },
    run(state, { compute }, size) {
        compute.kernels.extractScaleValuesF32(state.input, { count: size, componentCount: 4, componentIndex: 3, stride: 4, values: state.values, flags: state.flags });
    },
    operations(size) { return size; },
    workload(size) { return { elements: size, componentCount: 4, componentIndex: 3, stride: 4 }; },
    teardown(state) { state.input.destroy(); state.values.destroy(); state.flags.destroy(); }
};
