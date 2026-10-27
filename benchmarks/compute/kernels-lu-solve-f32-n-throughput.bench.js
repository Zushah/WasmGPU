/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeMatricesF32 } from "../harness/data.js";

const BATCH_COUNT = 4;

export default {
    name: "kernels-lu-solve-f32-n-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "GFLOP/s",
    description: "Batched f32 LU solve throughput by matrix order, with factorization outside timed samples.",
    sizes: { quick: [128, 512, 513], full: [32, 64, 128, 256, 512, 513, 1024] },
    gpu: true,
    async setup({ compute, queue }, size) {
        const matrices = makeMatricesF32(BATCH_COUNT, size);
        const rhs = new Float32Array(BATCH_COUNT * size);
        for (let batch = 0; batch < BATCH_COUNT; batch++) {
            for (let row = 0; row < size; row++) rhs[batch * size + row] = ((row * 17 + batch * 13) % 97) / 97 - 0.5;
        }
        const state = {
            lu: compute.ndarray.fromArray("f32", [BATCH_COUNT, size, size], matrices, { residency: "gpu", label: "bench:lu-solve-f32-n:lu" }),
            ipiv: compute.ndarray.empty("u32", { shape: [BATCH_COUNT, size] }, { residency: "gpu", label: "bench:lu-solve-f32-n:ipiv" }),
            rhs: compute.ndarray.fromArray("f32", [BATCH_COUNT, size], rhs, { residency: "gpu", label: "bench:lu-solve-f32-n:rhs" }),
            outX: compute.ndarray.empty("f32", { shape: [BATCH_COUNT, size] }, { residency: "gpu", label: "bench:lu-solve-f32-n:outX" })
        };
        compute.kernels.luFactor(state.lu, { overwrite: true, ipiv: state.ipiv });
        await queue.onSubmittedWorkDone();
        return state;
    },
    run(state, { compute }, size) {
        compute.kernels.luSolve(state.lu, state.ipiv, state.rhs, { out: state.outX });
    },
    operations(size) { return BATCH_COUNT * 2 * size * size / 1e9; },
    workload(size) { return { n: size, batchCount: BATCH_COUNT, matrices: BATCH_COUNT, matrixElements: BATCH_COUNT * size * size, rhsElements: BATCH_COUNT * size, scalarElements: BATCH_COUNT * (size * size + size), dtype: "f32", factorizationTimed: false }; },
    teardown(state) { state.lu.destroy(); state.ipiv.destroy(); state.rhs.destroy(); state.outX.destroy(); }
};
