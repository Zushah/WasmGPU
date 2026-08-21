/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { makeF32 } from "../harness/data.js";

export default {
    name: "scale-service-percentile-stats-latency",
    subsystem: "scaling",
    type: "latency",
    unit: "ms",
    description: "ScaleService.requestStats latency for min/max plus 2nd/98th percentiles with cache misses and GPU readback.",
    sizes: { quick: [65_536, 1_048_576], full: [65_536, 1_048_576, 8_388_608] },
    gpu: false,
    setup({ WasmGPU, compute }, size) {
        return {
            buffer: compute.createStorageBuffer({ data: makeF32(size) }),
            scale: new WasmGPU.ScaleService(compute),
            revision: 0
        };
    },
    async run(state, _context, size) {
        state.revision++;
        await state.scale.requestStats({
            source: {
                buffer: state.buffer,
                count: size, componentCount: 1, componentIndex: 0,
                stride: 1, offset: 0,
                revision: state.revision
            },
            percentiles: { low: 2, high: 98, bins: 256 }
        });
    },
    operations() { return 1; },
    workload(size) { return { elements: size, percentiles: [2, 98], histogramBins: 256 }; },
    teardown(state) { state.scale.clearCache(); state.buffer.destroy(); }
};
