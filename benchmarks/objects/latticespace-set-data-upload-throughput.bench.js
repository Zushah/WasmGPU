/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "latticespace-set-data-upload-throughput",
    subsystem: "objects",
    type: "throughput",
    unit: "cells/s",
    description: "LatticeSpace.setData() scalar replacement plus upload() throughput with reusable object-owned GPU capacity.",
    sizes: { quick: [1_024, 16_384], full: [16_384, 131_072, 524_288] },
    gpu: true,
    async setup({ WasmGPU, device, queue }, size) {
        const data = makeF32(size), space = new WasmGPU.LatticeSpace({ dimensions: [size, 1], data });
        space.upload(device, queue);
        await queue.onSubmittedWorkDone();
        return { space, data };
    },
    run(state, { device, queue }) {
        state.space.setData(state.data);
        state.space.upload(device, queue);
    },
    operations(size) { return size; },
    workload(size) { return { scalarCellsReplacedAndUploaded: size }; },
    teardown(state) { state.space.destroy(); }
};
