/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "cpundarray-index-get-set-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "operations/s",
    description: "WASM-backed CPUndarray indexed set() and get() throughput over a contiguous f32 array.",
    sizes: { quick: [4_096, 65_536], full: [65_536, 262_144, 1_048_576] },
    gpu: false,
    setup({ compute }, size) {
        return {
            array: compute.CPUndarray.zeros("f32", { shape: [size] }),
            size,
            last: 0
        };
    },
    run(state) {
        for (let i = 0; i < state.size; i++) state.array.set(i, i);
        for (let i = 0; i < state.size; i++) state.last = state.array.get(i);
    },
    operations(size) { return size * 2; },
    workload(size) { return { elements: size, indexedOperations: size * 2 }; },
    teardown(state) { state.array.destroy(); }
};
