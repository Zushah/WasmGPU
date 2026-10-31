/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "kernels-matmul-c64-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "GFLOP/s",
    description: "Steady-state tiled square matmul throughput for c64 arrays with caller-provided output.",
    sizes: { quick: [128, 256], full: [128, 256, 512] },
    gpu: true,
    setup({ compute }, size) {
        return {
            a: compute.ndarray.fromArray("c64", [size, size], makeF32(size * size * 2), { residency: "gpu" }),
            b: compute.ndarray.fromArray("c64", [size, size], makeF32(size * size * 2), { residency: "gpu" }),
            out: compute.ndarray.empty("c64", { shape: [size, size] }, { residency: "gpu" })
        };
    },
    run(s, { compute }) {
        compute.kernels.matmul(s.a, s.b, { out: s.out });
    },
    operations(size) { return 8 * size * size * size / 1e9; },
    workload(size) { return { m: size, n: size, k: size, complexElements: size * size }; },
    teardown(s) { s.a.destroy(); s.b.destroy(); s.out.destroy(); }
};
