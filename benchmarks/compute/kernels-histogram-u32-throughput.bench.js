/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const BIN_COUNT = 256;

export default {
    name: "kernels-histogram-u32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Complete ComputeKernels.histogram throughput with 256-bin clearing, accumulation, and GPU completion.",
    sizes: { quick: [65_536, 1_048_576], full: [65_536, 1_048_576, 8_388_608, 16_777_216] },
    gpu: true,
    setup({ compute }, size) {
        const data = new Uint32Array(size);
        for (let i = 0; i < size; i++) data[i] = (Math.imul(i, 2654435761) >>> 16) & (BIN_COUNT - 1);
        return {
            keys: compute.ndarray.fromArray("u32", [size], data, { residency: "gpu" }),
            bins: compute.ndarray.empty("u32", { shape: [BIN_COUNT] }, { residency: "gpu" })
        };
    },
    run(state, { compute }) {
        compute.kernels.histogram(state.keys, { bins: BIN_COUNT, out: state.bins, clear: true });
    },
    operations(size) { return size; },
    workload(size) { return { elements: size, bins: BIN_COUNT }; },
    teardown(state) { state.keys.destroy(); state.bins.destroy(); }
};
