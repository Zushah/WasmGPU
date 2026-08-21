/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "mat4d-mul-throughput",
    subsystem: "math",
    type: "throughput",
    unit: "operations/s",
    description: "Lower-level f64 pointer-based mat4d.mul WebAssembly throughput with persistent operands and output.",
    sizes: { quick: [50_000, 250_000], full: [250_000, 1_000_000, 4_000_000] },
    gpu: false,
    setup({ WasmGPU }, size) {
        const api = WasmGPU.WasmGPU.math.mat4d, left = api.alloc(), right = api.alloc(), output = api.alloc();
        api.identity(left);
        api.identity(right);
        return { api, left, right, output, size, wasm: WasmGPU.wasm };
    },
    run(state) {
        for (let i = 0; i < state.size; i++) state.api.mul(state.output, state.left, state.right);
    },
    operations(size) { return size; },
    workload(size) { return { multiplications: size, precision: "f64", interface: "pointer" }; },
    teardown(state) { state.wasm.freeF64(state.left, 16); state.wasm.freeF64(state.right, 16); state.wasm.freeF64(state.output, 16); }
};
