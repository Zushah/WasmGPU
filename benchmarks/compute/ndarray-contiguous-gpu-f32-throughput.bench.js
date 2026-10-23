/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "ndarray-contiguous-gpu-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state compute.ndarray.contiguous of a transposed square f32 GPU matrix into a caller-provided output, including per-call parameter buffers, submission, and GPU completion.",
    sizes: { quick: [256, 1_024], full: [256, 1_024, 2_048] },
    gpu: true,
    setup({ compute }, size) {
        const source = compute.ndarray.fromArray("f32", [size, size], makeF32(size * size), { residency: "gpu" });
        return { source, view: compute.ndarray.transpose(source), out: compute.ndarray.empty("f32", { shape: [size, size] }, { residency: "gpu" }) };
    },
    run(state, { compute }) {
        compute.ndarray.contiguous(state.view, { out: state.out });
    },
    operations(size) { return size * size; },
    workload(size) { return { rows: size, columns: size, elements: size * size, bytesRead: size * size * 4, bytesWritten: size * size * 4 }; },
    teardown(state) { state.out.destroy(); state.source.destroy(); }
};
