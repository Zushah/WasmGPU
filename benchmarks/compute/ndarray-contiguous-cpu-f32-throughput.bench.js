/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "ndarray-contiguous-cpu-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "WebAssembly compute.ndarray.contiguous of a transposed square f32 CPU matrix, including output allocation and destruction.",
    sizes: { quick: [256, 1_024], full: [256, 1_024, 2_048] },
    gpu: false,
    setup({ compute }, size) {
        const source = compute.ndarray.fromArray("f32", [size, size], makeF32(size * size));
        return { source, view: compute.ndarray.transpose(source) };
    },
    run(state, { compute }) {
        compute.ndarray.contiguous(state.view).destroy();
    },
    operations(size) { return size * size; },
    workload(size) { return { rows: size, columns: size, elements: size * size, bytesRead: size * size * 4, bytesWritten: size * size * 4 }; },
    teardown(state) { state.source.destroy(); }
};
