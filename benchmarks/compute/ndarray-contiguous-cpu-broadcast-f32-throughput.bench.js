/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "ndarray-contiguous-cpu-broadcast-f32-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "elements/s",
    description: "WebAssembly compute.ndarray.contiguous of an f32 CPU column broadcast across a square matrix (zero-stride fastest axis), including output allocation and destruction.",
    sizes: { quick: [256, 1_024], full: [256, 1_024, 2_048] },
    gpu: false,
    setup({ compute }, size) {
        const source = compute.ndarray.fromArray("f32", [size, 1], makeF32(size));
        return { source, view: compute.ndarray.broadcastTo(source, [size, size]) };
    },
    run(state, { compute }) {
        compute.ndarray.contiguous(state.view).destroy();
    },
    operations(size) { return size * size; },
    workload(size) { return { rows: size, columns: size, elements: size * size, bytesRead: size * 4, bytesWritten: size * size * 4 }; },
    teardown(state) { state.source.destroy(); }
};
