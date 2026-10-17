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
            lu: compute.createStorageBuffer({ label: "bench:lu-solve-c64-n:lu", data: matrices }),
            ipiv: compute.createStorageBuffer({ label: "bench:lu-solve-c64-n:ipiv", byteLength: BATCH_COUNT * size * 4 }),
            rhs: compute.createStorageBuffer({ label: "bench:lu-solve-c64-n:rhs", data: rhs }),
            outX: compute.createStorageBuffer({ label: "bench:lu-solve-c64-n:outX", byteLength: rhs.byteLength })
        };
        compute.kernels.luFactorC64Batched(state.lu, state.ipiv, BATCH_COUNT, size);
        await queue.onSubmittedWorkDone();
        return state;
    },
    run(state, { compute }, size) {
        compute.kernels.luSolveC64Batched(state.lu, state.ipiv, state.rhs, state.outX, BATCH_COUNT, size);
    },
    operations(size) { return BATCH_COUNT * 8 * size * size / 1e9; },
    workload(size) { return { n: size, batchCount: BATCH_COUNT, matrices: BATCH_COUNT, complexElements: BATCH_COUNT * (size * size + size), matrixComplexElements: BATCH_COUNT * size * size, rhsComplexElements: BATCH_COUNT * size, scalarElements: BATCH_COUNT * (size * size + size) * 2, dtype: "c64", factorizationTimed: false }; },
    teardown(state) { state.lu.destroy(); state.ipiv.destroy(); state.rhs.destroy(); state.outX.destroy(); }
};
