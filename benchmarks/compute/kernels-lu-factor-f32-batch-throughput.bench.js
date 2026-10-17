/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeMatricesF32 } from "../harness/data.js";

const MATRIX_ORDER = 128;

export default {
    name: "kernels-lu-factor-f32-batch-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "GFLOP/s",
    description: "Batched f32 LU factorization throughput by batch count, including GPU buffer reset.",
    sizes: { quick: [1, 8, 64], full: [1, 2, 4, 8, 16, 32, 64, 128] },
    gpu: true,
    setup({ compute }, size) {
        const matrices = makeMatricesF32(size, MATRIX_ORDER);
        return {
            source: compute.createStorageBuffer({ label: "bench:lu-factor-f32-batch:source", data: matrices, copyDst: false, copySrc: true }),
            matrices: compute.createStorageBuffer({ label: "bench:lu-factor-f32-batch:matrices", byteLength: matrices.byteLength }),
            ipiv: compute.createStorageBuffer({ label: "bench:lu-factor-f32-batch:ipiv", byteLength: size * MATRIX_ORDER * 4 })
        };
    },
    run(state, { compute, device, queue }, size) {
        const encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(state.source.buffer, 0, state.matrices.buffer, 0, state.source.byteLength);
        queue.submit([encoder.finish()]);
        compute.kernels.luFactorF32Batched(state.matrices, state.ipiv, size, MATRIX_ORDER);
    },
    operations(size) { return size * (2 / 3) * MATRIX_ORDER * MATRIX_ORDER * MATRIX_ORDER / 1e9; },
    workload(size) { return { n: MATRIX_ORDER, batchCount: size, matrices: size, matrixElements: size * MATRIX_ORDER * MATRIX_ORDER, scalarElements: size * MATRIX_ORDER * MATRIX_ORDER, dtype: "f32", includesGpuReset: true }; },
    teardown(state) { state.source.destroy(); state.matrices.destroy(); state.ipiv.destroy(); }
};
