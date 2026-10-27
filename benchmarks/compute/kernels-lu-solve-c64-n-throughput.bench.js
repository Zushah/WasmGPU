/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeMatricesC64 } from "../harness/data.js";

const BATCH_COUNT = 4;

export default {
    name: "kernels-lu-solve-c64-n-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "GFLOP/s",
    description: "Batched c64 LU solve throughput by matrix order, with factorization outside timed samples.",
    sizes: { quick: [128, 512, 513], full: [32, 64, 128, 256, 512, 513, 1024] },
    gpu: true,
    async setup({ compute, queue }, size) {
        const matrices = makeMatricesC64(BATCH_COUNT, size);
        const rhs = new Float32Array(BATCH_COUNT * size * 2);
        for (let batch = 0; batch < BATCH_COUNT; batch++) {
            for (let row = 0; row < size; row++) {
                const index = (batch * size + row) * 2;
                rhs[index] = ((row * 17 + batch * 13) % 97) / 97 - 0.5;
                rhs[index + 1] = ((row * 29 + batch * 7) % 89) / 89 - 0.5;
            }
        }
        const state = {
            lu: compute.ndarray.fromArray("f32", [BATCH_COUNT, size, size, 2], matrices, { residency: "gpu", label: "bench:lu-solve-c64-n:lu" }),
            ipiv: compute.ndarray.empty("u32", { shape: [BATCH_COUNT, size] }, { residency: "gpu", label: "bench:lu-solve-c64-n:ipiv" }),
            rhs: compute.ndarray.fromArray("f32", [BATCH_COUNT, size, 2], rhs, { residency: "gpu", label: "bench:lu-solve-c64-n:rhs" }),
            outX: compute.ndarray.empty("f32", { shape: [BATCH_COUNT, size, 2] }, { residency: "gpu", label: "bench:lu-solve-c64-n:outX" })
        };
        compute.kernels.luFactor(state.lu, { overwrite: true, ipiv: state.ipiv, complex: true });
        await queue.onSubmittedWorkDone();
        return state;
    },
    run(state, { compute }, size) {
        compute.kernels.luSolve(state.lu, state.ipiv, state.rhs, { out: state.outX, complex: true });
    },
    operations(size) { return BATCH_COUNT * 8 * size * size / 1e9; },
    workload(size) { return { n: size, batchCount: BATCH_COUNT, matrices: BATCH_COUNT, complexElements: BATCH_COUNT * (size * size + size), matrixComplexElements: BATCH_COUNT * size * size, rhsComplexElements: BATCH_COUNT * size, scalarElements: BATCH_COUNT * (size * size + size) * 2, dtype: "c64", factorizationTimed: false }; },
    teardown(state) { state.lu.destroy(); state.ipiv.destroy(); state.rhs.destroy(); state.outX.destroy(); }
};
