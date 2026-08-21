/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "webassembly-view-copy-throughput",
    subsystem: "interop",
    type: "throughput",
    unit: "GB/s",
    description: "JavaScript Float32Array copy throughput into a borrowed external WebAssembly memory view.",
    sizes: { quick: [65_536, 1_048_576], full: [1_048_576, 4_194_304, 16_777_216] },
    gpu: false,
    setup({ WasmGPU }, size) {
        const memory = new WebAssembly.Memory({ initial: Math.ceil(size * 4 / 65_536) });
        const module = WasmGPU.webassemblyInterop.fromMemory(memory, { name: "benchmark-transfer" });
        return {
            source: makeF32(size),
            view: module.view({ ptr: 0, length: size, dtype: "f32", name: "benchmark-transfer" })
        };
    },
    run(state) {
        state.view.array().set(state.source);
    },
    operations(size) { return size * 4 / 1e9; },
    workload(size) { return { elements: size, bytes: size * 4, direction: "js-to-webassembly" }; }
};
