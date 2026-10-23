/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "ndarray-cast-gpu-u8-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state compute.ndarray.cast of a contiguous u8 GPU array to f32 into a caller-provided output, including per-call parameter buffers, submission, and GPU completion.",
    sizes: { quick: [1_048_576, 16_777_216], full: [1_048_576, 8_388_608, 16_777_216] },
    gpu: true,
    setup({ compute }, size) {
        const values = new Uint8Array(size);
        for (let i = 0; i < size; i++) values[i] = (i * 31) & 0xFF;
        return {
            source: compute.ndarray.fromArray("u8", [size], values, { residency: "gpu" }),
            out: compute.ndarray.empty("f32", { shape: [size] }, { residency: "gpu" })
        };
    },
    run(state, { compute }) {
        compute.ndarray.cast(state.source, "f32", { out: state.out });
    },
    operations(size) { return size; },
    workload(size) { return { elements: size, bytesRead: size, bytesWritten: size * 4 }; },
    teardown(state) { state.out.destroy(); state.source.destroy(); }
};
