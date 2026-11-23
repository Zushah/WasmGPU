/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "ndarray-cast-cpu-u8-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "WebAssembly compute.ndarray.cast of a contiguous u8 CPU array to f32, including output allocation and destruction.",
    sizes: { quick: [1_048_576, 16_777_216], full: [1_048_576, 8_388_608, 16_777_216] },
    gpu: false,
    setup({ compute }, size) {
        const values = new Uint8Array(size);
        for (let i = 0; i < size; i++) values[i] = (i * 31) & 0xFF;
        return { source: compute.ndarray.fromArray("u8", [size], values) };
    },
    run(state, { compute }) {
        compute.ndarray.cast(state.source, "f32").destroy();
    },
    operations(size) { return size; },
    workload(size) { return { elements: size, bytesRead: size, bytesWritten: size * 4 }; },
    teardown(state) { state.source.destroy(); }
};
