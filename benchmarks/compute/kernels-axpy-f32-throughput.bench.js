/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "kernels-axpy-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "GB/s",
    description: "Steady-state axpyF32 memory throughput with caller-provided output.",
    sizes: { quick: [65_536, 1_048_576], full: [65_536, 1_048_576, 8_388_608] },
    gpu: true,
    setup({ compute }, size) {
        return {
            x: compute.createStorageBuffer({ data: makeF32(size) }),
            y: compute.createStorageBuffer({ data: makeF32(size) }),
            out: compute.createStorageBuffer({ byteLength: size * 4 })
        };
    },
    run(s, { compute }, size) {
        compute.kernels.axpyF32(s.x, s.y, 0.75, { out: s.out, count: size });
    },
    operations(size) { return size * 12 / 1e9; },
    workload(size) { return { elements: size, bytes: size * 12 }; },
    teardown(s) { s.x.destroy(); s.y.destroy(); s.out.destroy(); }
};
