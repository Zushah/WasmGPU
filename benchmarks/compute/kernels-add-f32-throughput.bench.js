/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "kernels-add-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "GB/s",
    description: "Steady-state addF32 memory throughput with caller-provided output.",
    sizes: { quick: [65_536, 1_048_576], full: [65_536, 1_048_576, 8_388_608] },
    gpu: true,
    setup({ compute }, size) {
        return {
            a: compute.createStorageBuffer({ data: makeF32(size) }),
            b: compute.createStorageBuffer({ data: makeF32(size) }),
            out: compute.createStorageBuffer({ byteLength: size * 4 })
        };
    },
    run(s, { compute }, size) {
        compute.kernels.addF32(s.a, s.b, { out: s.out, count: size });
    },
    operations(size) { return size * 12 / 1e9; },
    workload(size) { return { elements: size, bytes: size * 12 }; },
    teardown(s) { s.a.destroy(); s.b.destroy(); s.out.destroy(); }
};
