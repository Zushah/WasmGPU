/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeU16 } from "../harness/data.js";

export default {
    name: "ndarray-max-gpu-u16-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "Steady-state compute.ndarray.max along z of a cubic u16 GPU volume (a maximum-intensity projection) into a caller-provided output, including total-order keys, the 32-bit intermediate narrowed to u16, per-call parameters, submission, and GPU completion.",
    sizes: { quick: [64, 128], full: [64, 128, 256] },
    gpu: true,
    setup({ compute }, size) {
        return {
            source: compute.ndarray.fromArray("u16", [size, size, size], makeU16(size * size * size), { residency: "gpu" }),
            out: compute.ndarray.empty("u16", { shape: [size, size] }, { residency: "gpu" })
        };
    },
    run(state, { compute }) {
        compute.ndarray.max(state.source, { axes: 0, out: state.out });
    },
    operations(size) { return size * size * size; },
    workload(size) { return { side: size, reducedElements: size, outputs: size * size }; },
    teardown(state) { state.out.destroy(); state.source.destroy(); }
};
