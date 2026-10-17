/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeMatricesF32 } from "../harness/data.js";

const MATRIX_ORDER = 128;

export default {
    name: "kernels-lu-solve-f32-batch-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "GFLOP/s",
    description: "Batched f32 LU solve throughput by batch count, with factorization outside timed samples.",
    sizes: { quick: [1, 8, 64], full: [1, 2, 4, 8, 16, 32, 64, 128] },
    gpu: true,
    async setup({ compute, queue }, size) {
        const matrices = makeMatricesF32(size, MATRIX_ORDER);
        const rhs = new Float32Array(size * MATRIX_ORDER);
        for (let batch = 0; batch < size; batch++) {
            for (let row = 0; row < MATRIX_ORDER; row++) rhs[batch * MATRIX_ORDER + row] = ((row * 17 + batch * 13) % 97) / 97 - 0.5;
        }
        const state = {
            lu: compute.createStorageBuffer({ label: "bench:lu-solve-f32-batch:lu", data: matrices }),
            ipiv: compute.createStorageBuffer({ label: "bench:lu-solve-f32-batch:ipiv", byteLength: size * MATRIX_ORDER * 4 }),
            rhs: compute.createStorageBuffer({ label: "bench:lu-solve-f32-batch:rhs", data: rhs }),
            outX: compute.createStorageBuffer({ label: "bench:lu-solve-f32-batch:outX", byteLength: rhs.byteLength })
        };
        compute.kernels.luFactorF32Batched(state.lu, state.ipiv, size, MATRIX_ORDER);
        await queue.onSubmittedWorkDone();
        return state;
    },
    run(state, { compute }, size) {
        compute.kernels.luSolveF32Batched(state.lu, state.ipiv, state.rhs, state.outX, size, MATRIX_ORDER);
    },
    operations(size) { return size * 2 * MATRIX_ORDER * MATRIX_ORDER / 1e9; },
    workload(size) { return { n: MATRIX_ORDER, batchCount: size, matrices: size, matrixElements: size * MATRIX_ORDER * MATRIX_ORDER, rhsElements: size * MATRIX_ORDER, scalarElements: size * (MATRIX_ORDER * MATRIX_ORDER + MATRIX_ORDER), dtype: "f32", factorizationTimed: false }; },
    teardown(state) { state.lu.destroy(); state.ipiv.destroy(); state.rhs.destroy(); state.outX.destroy(); }
};
