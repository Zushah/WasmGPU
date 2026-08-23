/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export default {
    name: "readbackring-read-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "bytes/s",
    description: "ReadbackRing.read reusable GPU-to-CPU transfer throughput through completion, excluding source allocation.",
    sizes: { quick: [262_144, 1_048_576], full: [262_144, 1_048_576, 8_388_608] },
    gpu: false,
    maximumRepetitions: 64,
    setup({ compute }, size) {
        const data = new Uint8Array(size);
        for (let i = 0; i < size; i++) data[i] = Math.imul(i, 31) & 255;
        return {
            source: compute.createStorageBuffer({ data, copySrc: true }),
            ring: compute.createReadbackRing({ slots: 3, labelPrefix: "bench:readback" })
        };
    },
    async run(state, _context, size) {
        await state.ring.read(state.source, 0, size);
    },
    operations(size) { return size; },
    workload(size) { return { bytesRead: size, stagingSlots: 3 }; },
    teardown(state) { state.ring.destroy(); state.source.destroy(); }
};
