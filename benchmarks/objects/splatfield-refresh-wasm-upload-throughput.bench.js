/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "splatfield-refresh-wasm-upload-throughput",
    subsystem: "objects",
    type: "throughput",
    unit: "splats/s",
    description: "SplatField.refreshFromWasm() plus upload() throughput for four borrowed packed vec4 channels; object destruction is outside timing.",
    sizes: { quick: [1_024, 16_384], full: [16_384, 131_072, 524_288] },
    gpu: true,
    async setup({ WasmGPU, device, queue }, size) {
        const channelLength = size * 4, memory = new WebAssembly.Memory({ initial: Math.ceil(channelLength * 4 * 4 / 65_536) });
        const module = WasmGPU.webassemblyInterop.fromMemory(memory, { name: "splatfield-benchmark" });
        const channel = (index, name) => module.view({ ptr: index * channelLength * 4, length: channelLength, dtype: "f32", name });
        const centerOpacity = channel(0, "center-opacity"), rotation = channel(1, "rotation"), scale = channel(2, "scale"), color = channel(3, "color");
        const centerData = centerOpacity.array(), rotationData = rotation.array(), scaleData = scale.array(), colorData = color.array();
        for (let i = 0; i < size; i++) {
            centerData[i * 4] = (i % 512) * 0.01; centerData[i * 4 + 1] = Math.floor(i / 512) * 0.01; centerData[i * 4 + 3] = 0.8;
            rotationData[i * 4 + 3] = 1;
            scaleData[i * 4] = 1; scaleData[i * 4 + 1] = 1; scaleData[i * 4 + 2] = 1;
            colorData[i * 4] = 0.3; colorData[i * 4 + 1] = 0.6; colorData[i * 4 + 2] = 0.9; colorData[i * 4 + 3] = 1;
        }
        const channels = { centerOpacity, rotation, scale, color };
        const field = new WasmGPU.SplatField({ wasmCenterOpacity: channels.centerOpacity, wasmRotation: channels.rotation, wasmScale: channels.scale, wasmColor: channels.color, splatCount: size, wasmCapacity: size });
        field.upload(device, queue);
        await queue.onSubmittedWorkDone();
        return { field, size };
    },
    run(state, { device, queue }) {
        state.field.refreshFromWasm({ splatCount: state.size });
        state.field.upload(device, queue);
    },
    operations(size) { return size; },
    workload(size) { return { splatsRefreshedAndUploaded: size, borrowedVec4Channels: 4 }; },
    teardown(state) { state.field.destroy(); }
};
