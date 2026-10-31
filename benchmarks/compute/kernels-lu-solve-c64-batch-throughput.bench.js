/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeMatricesC64 } from "../harness/data.js";

const MATRIX_ORDER = 128;

export default {
    name: "kernels-lu-solve-c64-batch-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "GFLOP/s",
    description: "Batched c64 LU solve throughput by batch count, with factorization outside timed samples.",
    sizes: { quick: [1, 8, 64], full: [1, 2, 4, 8, 16, 32, 64, 128] },
    gpu: true,
    async setup({ compute, queue }, size) {
        const matrices = makeMatricesC64(size, MATRIX_ORDER);
        const rhs = new Float32Array(size * MATRIX_ORDER * 2);
        for (let batch = 0; batch < size; batch++) {
            for (let row = 0; row < MATRIX_ORDER; row++) {
                const index = (batch * MATRIX_ORDER + row) * 2;
                rhs[index] = ((row * 17 + batch * 13) % 97) / 97 - 0.5;
                rhs[index + 1] = ((row * 29 + batch * 7) % 89) / 89 - 0.5;
            }
        }
        const state = {
            lu: compute.ndarray.fromArray("c64", [size, MATRIX_ORDER, MATRIX_ORDER], matrices, { residency: "gpu", label: "bench:lu-solve-c64-batch:lu" }),
            ipiv: compute.ndarray.empty("u32", { shape: [size, MATRIX_ORDER] }, { residency: "gpu", label: "bench:lu-solve-c64-batch:ipiv" }),
            rhs: compute.ndarray.fromArray("c64", [size, MATRIX_ORDER], rhs, { residency: "gpu", label: "bench:lu-solve-c64-batch:rhs" }),
            outX: compute.ndarray.empty("c64", { shape: [size, MATRIX_ORDER] }, { residency: "gpu", label: "bench:lu-solve-c64-batch:outX" })
        };
        compute.kernels.luFactor(state.lu, { overwrite: true, ipiv: state.ipiv });
        await queue.onSubmittedWorkDone();
        return state;
    },
    run(state, { compute }, size) {
        compute.kernels.luSolve(state.lu, state.ipiv, state.rhs, { out: state.outX });
    },
    operations(size) { return size * 8 * MATRIX_ORDER * MATRIX_ORDER / 1e9; },
    workload(size) { return { n: MATRIX_ORDER, batchCount: size, matrices: size, complexElements: size * (MATRIX_ORDER * MATRIX_ORDER + MATRIX_ORDER), matrixComplexElements: size * MATRIX_ORDER * MATRIX_ORDER, rhsComplexElements: size * MATRIX_ORDER, scalarElements: size * (MATRIX_ORDER * MATRIX_ORDER + MATRIX_ORDER) * 2, dtype: "c64", factorizationTimed: false }; },
    teardown(state) { state.lu.destroy(); state.ipiv.destroy(); state.rhs.destroy(); state.outX.destroy(); }
};
