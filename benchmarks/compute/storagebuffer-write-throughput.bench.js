/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "storagebuffer-write-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "bytes/s",
    description: "StorageBuffer.write CPU-to-GPU throughput into existing storage, including queue completion and excluding allocation.",
    sizes: { quick: [65_536, 1_048_576], full: [65_536, 1_048_576, 8_388_608] },
    gpu: true,
    setup({ compute }, size) {
        const bytes = new Uint8Array(size);
        for (let i = 0; i < size; i++) bytes[i] = Math.imul(i, 31) & 255;
        return { bytes, output: compute.createStorageBuffer({ byteLength: size }) };
    },
    run(state) { state.output.write(state.bytes); },
    operations(size) { return size; },
    workload(size) { return { bytesWritten: size, destinationAllocationsPerRun: 0 }; },
    teardown(state) { state.output.destroy(); }
};
