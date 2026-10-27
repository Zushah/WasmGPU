/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "kernels-dot-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state dot reduction throughput with caller-provided output.",
    sizes: { quick: [65_536, 1_048_576], full: [65_536, 1_048_576, 8_388_608, 16_777_216] },
    gpu: true,
    setup({ compute }, size) {
        return {
            a: compute.ndarray.fromArray("f32", [size], makeF32(size), { residency: "gpu" }),
            b: compute.ndarray.fromArray("f32", [size], makeF32(size), { residency: "gpu" }),
            out: compute.ndarray.empty("f32", { shape: [] }, { residency: "gpu" })
        };
    },
    run(s, { compute }) {
        compute.kernels.dot(s.a, s.b, { out: s.out });
    },
    operations(size) { return size; },
    workload(size) { return { elements: size }; },
    teardown(s) { s.a.destroy(); s.b.destroy(); s.out.destroy(); }
};
