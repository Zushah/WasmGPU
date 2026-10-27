/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeMatricesF32 } from "../harness/data.js";

const BATCH_COUNT = 4;

export default {
    name: "kernels-lu-factor-f32-n-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "GFLOP/s",
    description: "Batched f32 LU factorization throughput by matrix order, including GPU buffer reset.",
    sizes: { quick: [128, 159, 160], full: [32, 64, 128, 159, 160, 256, 512, 1024] },
    gpu: true,
    setup({ compute }, size) {
        const matrices = makeMatricesF32(BATCH_COUNT, size);
        return {
            source: compute.ndarray.fromArray("f32", [BATCH_COUNT, size, size], matrices, { residency: "gpu", label: "bench:lu-factor-f32-n:source", copyDst: false, copySrc: true }),
            matrices: compute.ndarray.empty("f32", { shape: [BATCH_COUNT, size, size] }, { residency: "gpu", label: "bench:lu-factor-f32-n:matrices" }),
            ipiv: compute.ndarray.empty("u32", { shape: [BATCH_COUNT, size] }, { residency: "gpu", label: "bench:lu-factor-f32-n:ipiv" })
        };
    },
    run(state, { compute, device, queue }, size) {
        const encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(state.source.buffer.buffer, 0, state.matrices.buffer.buffer, 0, state.source.byteLength);
        queue.submit([encoder.finish()]);
        compute.kernels.luFactor(state.matrices, { overwrite: true, ipiv: state.ipiv });
    },
    operations(size) { return BATCH_COUNT * (2 / 3) * size * size * size / 1e9; },
    workload(size) { return { n: size, batchCount: BATCH_COUNT, matrices: BATCH_COUNT, matrixElements: BATCH_COUNT * size * size, scalarElements: BATCH_COUNT * size * size, dtype: "f32", includesGpuReset: true }; },
    teardown(state) { state.source.destroy(); state.matrices.destroy(); state.ipiv.destroy(); }
};
