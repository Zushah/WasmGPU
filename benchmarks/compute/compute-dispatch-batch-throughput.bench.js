/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const wgsl = `
@group(0) @binding(0) var<storage, read_write> value: array<u32>;
@compute @workgroup_size(1)
fn main() {
    value[0] = value[0] + 1u;
}
`;

export default {
    name: "compute-dispatch-batch-throughput",
    subsystem: "compute",
    type: "throughput",
    unit: "dispatches/s",
    description: "Compute.dispatchBatch command encoding and submission throughput for tiny one-workgroup dispatches, including GPU completion.",
    sizes: { quick: [16, 256], full: [16, 256, 2_048] },
    gpu: true,
    setup({ compute }, size) {
        const output = compute.createStorageBuffer({ byteLength: 4 });
        const pipeline = compute.createPipeline({
            label: "bench:dispatchBatch",
            code: wgsl,
            bindGroups: [{ entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }] }]
        });
        const bindGroup = pipeline.createBindGroup(0, { 0: output });
        const command = { pipeline, bindGroups: [bindGroup], workgroups: [1, 1, 1] };
        return {
            output,
            commands: Array.from({ length: size }, () => command)
        };
    },
    run(state, { compute }) {
        compute.dispatchBatch(state.commands, "bench:dispatchBatch", {
            validateLimits: true
        });
    },
    operations(size) { return size; },
    workload(size) { return { dispatches: size, workgroupsPerDispatch: [1, 1, 1], invocationsPerWorkgroup: 1 }; },
    teardown(state) { state.output.destroy(); }
};
