/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeU32 } from "../harness/data.js";

export default {
    name: "kernels-matmul-u32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "Gops/s",
    description: "Steady-state tiled square matmul throughput for u32 with caller-provided output.",
    sizes: { quick: [128, 256], full: [128, 256, 512, 1024] },
    gpu: true,
    setup({ compute }, size) {
        return {
            a: compute.ndarray.fromArray("u32", [size, size], makeU32(size * size), { residency: "gpu" }),
            b: compute.ndarray.fromArray("u32", [size, size], makeU32(size * size), { residency: "gpu" }),
            out: compute.ndarray.empty("u32", { shape: [size, size] }, { residency: "gpu" })
        };
    },
    run(s, { compute }) {
        compute.kernels.matmul(s.a, s.b, { out: s.out });
    },
    operations(size) { return 2 * size * size * size / 1e9; },
    workload(size) { return { m: size, n: size, k: size }; },
    teardown(s) { s.a.destroy(); s.b.destroy(); s.out.destroy(); }
};
