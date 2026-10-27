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
            source: compute.ndarray.fromArray("f32", [size, MATRIX_ORDER, MATRIX_ORDER], matrices, { residency: "gpu", label: "bench:lu-factor-f32-batch:source", copyDst: false, copySrc: true }),
            matrices: compute.ndarray.empty("f32", { shape: [size, MATRIX_ORDER, MATRIX_ORDER] }, { residency: "gpu", label: "bench:lu-factor-f32-batch:matrices" }),
            ipiv: compute.ndarray.empty("u32", { shape: [size, MATRIX_ORDER] }, { residency: "gpu", label: "bench:lu-factor-f32-batch:ipiv" })
        };
    },
    run(state, { compute, device, queue }, size) {
        const encoder = device.createCommandEncoder();
        encoder.copyBufferToBuffer(state.source.buffer.buffer, 0, state.matrices.buffer.buffer, 0, state.source.byteLength);
        queue.submit([encoder.finish()]);
        compute.kernels.luFactor(state.matrices, { overwrite: true, ipiv: state.ipiv });
    },
    operations(size) { return size * (2 / 3) * MATRIX_ORDER * MATRIX_ORDER * MATRIX_ORDER / 1e9; },
    workload(size) { return { n: MATRIX_ORDER, batchCount: size, matrices: size, matrixElements: size * MATRIX_ORDER * MATRIX_ORDER, scalarElements: size * MATRIX_ORDER * MATRIX_ORDER, dtype: "f32", includesGpuReset: true }; },
    teardown(state) { state.source.destroy(); state.matrices.destroy(); state.ipiv.destroy(); }
};
