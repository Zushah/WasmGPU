/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "kernels-gemm-c64-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "GFLOP/s",
    description: "Steady-state tiled square gemmC64 throughput with caller-provided output.",
    sizes: { quick: [128, 256], full: [128, 256, 512] },
    gpu: true,
    setup({ compute }, size) {
        return {
            a: compute.createStorageBuffer({ data: makeF32(size * size * 2) }),
            b: compute.createStorageBuffer({ data: makeF32(size * size * 2) }),
            out: compute.createStorageBuffer({ byteLength: size * size * 8 })
        };
    },
    run(s, { compute }, size) {
        compute.kernels.gemmC64(s.a, s.b, size, size, size, { out: s.out });
    },
    operations(size) { return 8 * size * size * size / 1e9; },
    workload(size) { return { m: size, n: size, k: size, complexElements: size * size }; },
    teardown(s) { s.a.destroy(); s.b.destroy(); s.out.destroy(); }
};
