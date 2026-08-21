/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "nodelink-update-node-positions-upload-throughput",
    subsystem: "objects",
    type: "throughput",
    unit: "nodes/s",
    description: "NodeLink.updateNodePositions() full-range vec3 patch plus upload() throughput with persistent object-owned GPU storage.",
    sizes: { quick: [1_024, 16_384], full: [16_384, 131_072, 524_288] },
    gpu: true,
    async setup({ WasmGPU, device, queue }, size) {
        const positions = makeF32(size * 3), link = new WasmGPU.NodeLink({ nodePositions: positions, keepCPUData: true });
        link.upload(device, queue);
        await queue.onSubmittedWorkDone();
        return { link, positions };
    },
    run(state, { device, queue }) {
        state.link.updateNodePositions(state.positions, 0, 3);
        state.link.upload(device, queue);
    },
    operations(size) { return size; },
    workload(size) { return { nodePositionsUpdatedAndUploaded: size, sourceStride: 3 }; },
    teardown(state) { state.link.destroy(); }
};
