/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "glyphfield-set-cpu-data-upload-throughput",
    subsystem: "objects",
    type: "throughput",
    unit: "instances/s",
    description: "GlyphField.setCPUData() replacement of four vec4 channels plus upload() throughput using object-owned buffers.",
    sizes: { quick: [1_024, 16_384], full: [16_384, 131_072, 524_288] },
    gpu: true,
    async setup({ WasmGPU, device, queue }, size) {
        const positions = makeF32(size * 4), rotations = new Float32Array(size * 4), scales = new Float32Array(size * 4), attributes = makeF32(size * 4);
        for (let i = 0; i < size; i++) { rotations[i * 4 + 3] = 1; scales[i * 4] = 1; scales[i * 4 + 1] = 1; scales[i * 4 + 2] = 1; }
        const field = new WasmGPU.GlyphField({ scaleTransform: { componentCount: 4, componentIndex: 0, stride: 4 } });
        field.setCPUData(positions, rotations, scales, attributes, { instanceCount: size });
        field.upload(device, queue);
        await queue.onSubmittedWorkDone();
        return { field, positions, rotations, scales, attributes, size };
    },
    run(state, { device, queue }) {
        state.field.setCPUData(state.positions, state.rotations, state.scales, state.attributes, { instanceCount: state.size });
        state.field.upload(device, queue);
    },
    operations(size) { return size; },
    workload(size) { return { instancesReplacedAndUploaded: size, vec4Channels: 4 }; },
    teardown(state) { state.field.destroy(); }
};
