/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "pointcloud-set-data-upload-throughput",
    subsystem: "objects",
    type: "throughput",
    unit: "points/s",
    description: "PointCloud.setData() full replacement plus upload() throughput with reusable object-owned GPU capacity.",
    sizes: { quick: [1_024, 16_384], full: [16_384, 131_072, 524_288] },
    gpu: true,
    async setup({ WasmGPU, device, queue }, size) {
        const data = makeF32(size * 4), cloud = new WasmGPU.PointCloud({ scaleTransform: { componentCount: 4, componentIndex: 3, stride: 4 } });
        cloud.setData(data);
        cloud.upload(device, queue);
        await queue.onSubmittedWorkDone();
        return { cloud, data };
    },
    run(state, { device, queue }) {
        state.cloud.setData(state.data);
        state.cloud.upload(device, queue);
    },
    operations(size) { return size; },
    workload(size) { return { pointsReplacedAndUploaded: size, packedFloatsPerPoint: 4 }; },
    teardown(state) { state.cloud.destroy(); }
};
