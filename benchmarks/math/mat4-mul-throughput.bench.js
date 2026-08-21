/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "mat4-mul-throughput",
    subsystem: "math",
    type: "throughput",
    unit: "operations/s",
    description: "Public convenience-layer mat4.mul throughput, including JavaScript array conversion and returned allocation.",
    sizes: { quick: [1_000, 10_000], full: [10_000, 100_000, 500_000] },
    gpu: false,
    setup({ WasmGPU }, size) {
        return { mat4: WasmGPU.mat4, left: WasmGPU.mat4.identity(), right: WasmGPU.mat4.random(-0.01, 0.01), size, value: null };
    },
    run(state) {
        let value = state.left;
        for (let i = 0; i < state.size; i++) value = state.mat4.mul(value, state.right);
        state.value = value;
    },
    operations(size) { return size; },
    workload(size) { return { multiplications: size, interface: "convenience" }; }
};
