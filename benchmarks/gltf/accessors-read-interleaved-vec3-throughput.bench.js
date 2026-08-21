/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "accessors-read-interleaved-vec3-throughput",
    subsystem: "gltf",
    type: "throughput",
    unit: "elements/s",
    description: "readAccessor throughput while compacting an interleaved f32 VEC3 accessor with a 16-byte stride.",
    sizes: { quick: [65_536, 262_144], full: [262_144, 1_048_576, 4_194_304] },
    gpu: false,
    setup(_context, size) {
        const buffer = new ArrayBuffer(size * 16), values = new Float32Array(buffer);
        for (let i = 0; i < size; i++) { values[i * 4] = i; values[i * 4 + 1] = i + 1; values[i * 4 + 2] = i + 2; }
        return {
            document: {
                json: {
                    buffers: [{ byteLength: buffer.byteLength }],
                    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: buffer.byteLength, byteStride: 16 }],
                    accessors: [{ bufferView: 0, componentType: 5126, count: size, type: "VEC3" }]
                }, buffers: [buffer]
            }, last: null
        };
    },
    run(state, { WasmGPU }) {
        state.last = WasmGPU.readAccessor(state.document, 0);
    },
    operations(size) { return size; },
    workload(size) { return { elements: size, components: size * 3, byteStride: 16 }; }
};
