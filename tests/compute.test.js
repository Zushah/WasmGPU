/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, createTestRandom, destroyTestDevice, setupTest } from "./utils/helpers.js";
import { Compute, ComputePipeline, webgpuInterop, makeWorkgroupSize, makeWorkgroupCounts, workgroups1D, workgroups2D, workgroups3D, normalizeWorkgroups } from "../release/WasmGPU.js";

const { arraysApproxEqual } = createApproxHelpers(1e-5);

const random = createTestRandom();

const randFloat = (min, max) => min + (max - min) * random();

const makeRandomArray = (n, min = -10, max = 10) => {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = randFloat(min, max);
    return a;
};

const { device } = await setupTest({ webgpu: true });

const compute = new Compute(device, device.queue);

// 1) Sanity check: helpers are correct.
{
    assert.deepStrictEqual(makeWorkgroupSize(64, 1, 1), [64, 1, 1]);
    assert.deepStrictEqual(makeWorkgroupCounts(10, 2, 3), [10, 2, 3]);
    assert.deepStrictEqual(workgroups1D(0, 64), [0, 1, 1]);
    assert.deepStrictEqual(workgroups2D(33, 33, 16, 16), [3, 3, 1]);
    assert.deepStrictEqual(workgroups3D(9, 8, 8, 8, 8, 8), [2, 1, 1]);
    assert.deepStrictEqual(normalizeWorkgroups([5, 2, 3]), { x: 5, y: 2, z: 3 });
    assert.deepStrictEqual(normalizeWorkgroups({ x: 5 }), { x: 5, y: 1, z: 1 });
}

// 2) Compute pipelines support single and batched dispatches across boundary workgroup sizes.
{
    const mul2WGSL = `
        @group(0) @binding(0) var<storage, read> a : array<f32>;
        @group(0) @binding(1) var<storage, read_write> out : array<f32>;
        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
            let i = gid.x;
            if (i < arrayLength(&out)) {
                out[i] = a[i] * 2.0;
            }
        }
    `;
    const addinplaceWGSL = `
        @group(0) @binding(0) var<storage, read> b : array<f32>;
        @group(0) @binding(1) var<storage, read_write> out : array<f32>;
        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
            let i = gid.x;
            if (i < arrayLength(&out)) {
                out[i] = out[i] + b[i];
            }
        }
    `;
    const pipelineMul2 = new ComputePipeline(device, { label: "mul2", code: mul2WGSL, entryPoint: "main" });
    const pipelineAdd = new ComputePipeline(device, { label: "add", code: addinplaceWGSL, entryPoint: "main" });

    // Run a few sizes including non-multiples of 64 to validate bounds logic.
    const sizes = [1, 2, 63, 64, 65, 127, 128, 129, 1024];

    for (const n of sizes) {
        const a = makeRandomArray(n);
        const b = makeRandomArray(n);
        const bufA = compute.createStorageBuffer({ label: `A_${n}`, data: a, copySrc: false });
        const bufB = compute.createStorageBuffer({ label: `B_${n}`, data: b, copySrc: false });
        const bufOut = compute.createStorageBuffer({ label: `OUT_${n}`, byteLength: n * 4, copySrc: true });
        const bgMul2 = pipelineMul2.createBindGroup(0, { 0: bufA, 1: bufOut });
        const bgAdd = pipelineAdd.createBindGroup(0, { 0: bufB, 1: bufOut });

        // 1) Test single-dispatch convenience path.
        compute.dispatch1D(pipelineMul2, [bgMul2], n, 64, `mul2_${n}`);
        await device.queue.onSubmittedWorkDone();
        {
            const out1 = await bufOut.readAs(Float32Array);
            const expected1 = new Float32Array(n);
            for (let i = 0; i < n; i++) expected1[i] = a[i] * 2.0;
            arraysApproxEqual(out1, expected1, 1e-5, `mul2 output mismatch for n=${n}`);
        }

        // 2) Test batch dispatch utility (two commands, one compute pass).
        compute.dispatchBatch(
            [
                { pipeline: pipelineMul2, bindGroups: [bgMul2], workgroups: workgroups1D(n, 64), label: `mul2_${n}_batch` },
                { pipeline: pipelineAdd, bindGroups: [bgAdd], workgroups: workgroups1D(n, 64), label: `add_${n}_batch` }
            ],
            `batch_${n}`
        );
        await device.queue.onSubmittedWorkDone();
        {
            const out2 = await bufOut.readAs(Float32Array);
            const expected2 = new Float32Array(n);
            for (let i = 0; i < n; i++) expected2[i] = a[i] * 2.0 + b[i];
            arraysApproxEqual(out2, expected2, 1e-5, `mul2+add output mismatch for n=${n}`);
        }

        bufA.destroy();
        bufB.destroy();
        bufOut.destroy();
    }
}

// 3) Uniform buffers support creation, writes, binding, and end-to-end affine compute.
{
    const affineWGSL = `
        struct Params {
            scale : f32,
            bias : f32,
            _pad0 : f32,
            _pad1 : f32,
        }
        @group(0) @binding(0) var<uniform> params : Params;
        @group(0) @binding(1) var<storage, read> a : array<f32>;
        @group(0) @binding(2) var<storage, read_write> out : array<f32>;
        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
            let i = gid.x;
            if (i < arrayLength(&out)) {
                out[i] = a[i] * params.scale + params.bias;
            }
        }
    `;
    const n = 513;
    const a = makeRandomArray(n);
    const scale = 3.25;
    const bias = -1.75;
    const params = compute.createUniformBuffer({ label: "params", data: new Float32Array([scale, bias, 0, 0]) });
    const bufA = compute.createStorageBuffer({ label: "a_affine", data: a });
    const bufOut = compute.createStorageBuffer({ label: "out_affine", byteLength: n * 4, copySrc: true });
    const pipelineAffine = compute.createPipeline({
        label: "affine",
        code: affineWGSL,
        entryPoint: "main",
        bindGroups: [{ entries: [webgpuInterop.uniformBufferLayout({ binding: 0, minBindingSize: 16 }), webgpuInterop.storageBufferLayout({ binding: 1, readOnly: true }), webgpuInterop.storageBufferLayout({ binding: 2 })] }]
    });
    const bg = pipelineAffine.createBindGroup(0, { 0: params, 1: { buffer: bufA.buffer, size: n * 4 }, 2: bufOut });
    compute.dispatch1D(pipelineAffine, [bg], n, 64, "affine");
    await device.queue.onSubmittedWorkDone();
    const out = await bufOut.readAs(Float32Array);
    const expected = new Float32Array(n);
    for (let i = 0; i < n; i++) expected[i] = a[i] * scale + bias;
    arraysApproxEqual(out, expected, 1e-5, "affine output mismatch");
    params.destroy();
    bufA.destroy();
    bufOut.destroy();
}

// 4) Repeated batch state, zero-sized dispatches, object workgroups, and submit:false preserve semantics.
{
    const code = `
        @group(0) @binding(0) var<storage, read_write> out : array<u32>;
        @compute @workgroup_size(1) fn main() { out[0] = out[0] + 1u; }
    `;
    const out = compute.createStorageBuffer({ data: new Uint32Array([0]), copySrc: true });
    const pipeline = compute.createPipeline({ code });
    const bg = pipeline.createBindGroup(0, { 0: out });
    const command = { pipeline, bindGroups: [bg], workgroups: { x: 1 } };
    const commandBuffer = compute.dispatchBatch([
        { pipeline, bindGroups: [bg], workgroups: [0, 1, 1], label: "skip-zero" },
        command,
        { pipeline, bindGroups: [null, undefined], workgroups: { x: 1 } },
        command,
        command
    ], "repeated-state", { submit: false, validateLimits: true });
    compute.queue.submit([commandBuffer]);
    await compute.queue.onSubmittedWorkDone();
    assert.deepStrictEqual(Array.from(await out.readAs(Uint32Array)), [4]);
    command.workgroups.x = 0;
    compute.dispatchBatch([command], "mutated-state", { validateLimits: true });
    command.workgroups.x = 1;
    compute.dispatchBatch([command], "mutated-state", { validateLimits: true });
    await compute.queue.onSubmittedWorkDone();
    assert.deepStrictEqual(Array.from(await out.readAs(Uint32Array)), [5], "Command state must not be memoized across calls");
    let beganInvalidPass = false;
    const observingEncoder = {
        beginComputePass() {
            beganInvalidPass = true;
            throw new Error("beginComputePass must not be reached for an invalid batch");
        }
    };
    assert.throws(() => compute.encodeDispatchBatch(observingEncoder, [
        { pipeline, bindGroups: [bg], workgroups: { x: 1 } },
        { pipeline, bindGroups: [null, undefined], workgroups: { x: device.limits.maxComputeWorkgroupsPerDimension + 1 } }
    ], "invalid-later-limit", true), /maxComputeWorkgroupsPerDimension/);
    assert.strictEqual(beganInvalidPass, false, "Validated dispatch batches must reject all invalid commands before opening a compute pass");
    out.destroy();
}

// 5) Cleanup releases the shared compute context before its browser GPU device.
{
    compute.destroy();
    await destroyTestDevice(device);
}
