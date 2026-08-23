/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeU32 } from "../harness/data.js";

export default {
    name: "kernels-radix-sort-pairs-u32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state out-of-place ComputeKernels.radixSortPairsU32 throughput excluding readback and including GPU completion.",
    sizes: { quick: [16_384, 262_144], full: [16_384, 262_144, 2_097_152] },
    gpu: true,
    setup({ compute }, size) {
        return {
            keys: compute.createStorageBuffer({ data: makeU32(size) }),
            values: compute.createStorageBuffer({ data: Uint32Array.from({ length: size }, (_, i) => i) }),
            outKeys: compute.createStorageBuffer({ byteLength: size * 4 }),
            outValues: compute.createStorageBuffer({ byteLength: size * 4 })
        };
    },
    run(state, { compute }) {
        compute.kernels.radixSortPairsU32(state.keys, state.values, { outKeys: state.outKeys, outValues: state.outValues });
    },
    operations(size) { return size; },
    workload(size) { return { keyValuePairs: size }; },
    teardown(state) { state.keys.destroy(); state.values.destroy(); state.outKeys.destroy(); state.outValues.destroy(); }
};
