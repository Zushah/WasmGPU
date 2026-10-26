/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { createApproxHelpers, createTestRandom, destroyTestDevice, setupTest } from "./utils/helpers.js";
import { Compute, ComputePipeline, webgpuInterop, makeWorkgroupSize, makeWorkgroupCounts, workgroups1D, workgroups2D, workgroups3D, workgroupsFolded, normalizeWorkgroups } from "../release/WasmGPU.js";

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
    assert.deepStrictEqual(workgroups1D(16_777_216, 256), [65536, 1, 1], "workgroups1D must never fold");
    assert.deepStrictEqual(workgroups2D(33, 33, 16, 16), [3, 3, 1]);
    assert.deepStrictEqual(workgroups3D(9, 8, 8, 8, 8, 8), [2, 1, 1]);
    assert.deepStrictEqual(workgroupsFolded(16_776_961, 256), [32768, 2, 1]);
    assert.deepStrictEqual(workgroupsFolded([33, 33], [16, 16]), [3, 3, 1], "Fitting grids must not fold");
    assert.deepStrictEqual(workgroupsFolded([40, 3], [8, 1], 4), [4, 4, 1]);
    assert.deepStrictEqual(workgroupsFolded([7, 5, 3], [2, 2, 2], 3), [3, 3, 3]);
    assert.deepStrictEqual(workgroupsFolded(26 * 64, 64, 5), [5, 3, 2]);
    assert.throws(() => workgroupsFolded([10, 10], 8), /same rank/);
    assert.throws(() => workgroupsFolded(2 ** 32, 256), /32-bit invocation indexing/);
    assert.throws(() => workgroupsFolded([2.5, 4], [1, 1]), /integer/);
    assert.throws(() => workgroups1D(256.5, 256), /integer/);
    const maxWorkgroups = device.limits.maxComputeWorkgroupsPerDimension;
    assert.throws(() => compute.workgroups1D(maxWorkgroups * 256 + 1, 256), /workgroupsFolded/);
    for (const n of [1000, maxWorkgroups * 256 + 1]) assert.deepStrictEqual(compute.workgroupsFolded(n, 256), workgroupsFolded(n, 256, maxWorkgroups), `Compute.workgroupsFolded must apply the device limit for n=${n}`);
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

// 5) Borrowed external storage preserves logical ranges through writes, bindings, and readback.
{
    const offsetBytes = device.limits.minStorageBufferOffsetAlignment;
    const raw = device.createBuffer({ size: offsetBytes + 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    const expected = new Uint32Array(raw.size / 4).fill(99);
    device.queue.writeBuffer(raw, 0, expected);
    const storage = compute.wrapStorageBuffer(raw, { offsetBytes, byteLength: 16 });
    assert.strictEqual(storage.buffer, raw);
    assert.strictEqual(storage.offsetBytes, offsetBytes);
    assert.strictEqual(storage.byteLength, 16);
    storage.write(new Uint32Array([1, 2, 3, 4]));
    const pipeline = compute.createPipeline({ code: `
        @group(0) @binding(0) var<storage, read_write> values : array<u32>;
        @compute @workgroup_size(1) fn main(@builtin(global_invocation_id) id : vec3<u32>) {
            if (id.x < arrayLength(&values)) { values[id.x] *= 2u; }
        }
    ` });
    compute.dispatch1D(pipeline, [pipeline.createBindGroup(0, { 0: storage })], 8, 1);
    assert.deepStrictEqual(Array.from(await storage.readAs(Uint32Array)), [2, 4, 6, 8]);
    assert.deepStrictEqual(Array.from(await compute.readback.readAs(Uint32Array, storage, 4, 8)), [4, 6]);
    expected.set([2, 4, 6, 8], offsetBytes / 4);
    assert.deepStrictEqual(Array.from(await compute.readback.readAs(Uint32Array, raw)), Array.from(expected), "Compute must preserve surrounding sentinel bytes");
    storage.destroy();
    storage.destroy();
    assert.throws(() => storage.write(new Uint32Array([0])), /destroyed/);
    device.queue.writeBuffer(raw, offsetBytes, new Uint32Array([42]));
    assert.strictEqual(await compute.readback.readScalarU32(raw, offsetBytes), 42, "Borrowed wrapper destruction must leave the raw buffer alive");
    raw.destroy();
}

// 6) External ownership, ndarray metadata, and invalid storage ranges have explicit semantics.
{
    const offsetBytes = device.limits.minStorageBufferOffsetAlignment;
    const raw = device.createBuffer({ size: offsetBytes + 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
    const storage = compute.wrapStorageBuffer(raw, { offsetBytes, ownBuffer: true });
    storage.write(new Uint32Array([10, 20, 30, 40]));
    const array = compute.ndarray.wrap(storage, "u32", { shape: [3], offsetBytes: 4 });
    assert.strictEqual(array.byteLength, 16);
    assert.deepStrictEqual(webgpuInterop.bindingResource(array.bindingResource()), { buffer: raw, offset: offsetBytes, size: 16 });
    assert.throws(() => compute.ndarray.wrap(storage, "u32", { shape: [5] }), /out of bounds/);
    assert.strictEqual(compute.CPUndarray, undefined);
    assert.strictEqual(compute.GPUndarray, undefined);
    assert.throws(() => compute.wrapStorageBuffer(raw, { offsetBytes, byteLength: 20 }), /out of bounds/);
    const noStorage = device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST });
    assert.throws(() => compute.wrapStorageBuffer(noStorage), /STORAGE/);
    noStorage.destroy();
    array.destroy();
    assert.deepStrictEqual(Array.from(await storage.readAs(Uint32Array)), [10, 20, 30, 40], "Wrapped ndarrays borrow their StorageBuffer");
    storage.destroy();
    storage.destroy();
    device.pushErrorScope("validation");
    device.queue.writeBuffer(raw, 0, new Uint32Array([0]));
    assert.ok(await device.popErrorScope(), "Owned wrapper destruction must destroy the raw GPUBuffer");
}

// 7) Kernels on folded workgroup grids rebuild each linear index exactly once in one to three dimensions, and oversized kernel bindings fail before allocation.
{
    const pipeline = compute.createPipeline({ code: `
        @group(0) @binding(0) var<storage, read_write> out : array<u32>;
        @group(0) @binding(1) var<storage, read_write> executions : atomic<u32>;
        fn invocation_index(wid : vec3<u32>, nwg : vec3<u32>, lid : u32) -> u32 {
            return (wid.y * nwg.x + wid.x) * 256u + lid;
        }
        @compute @workgroup_size(256)
        fn main(@builtin(workgroup_id) wid : vec3<u32>, @builtin(num_workgroups) nwg : vec3<u32>, @builtin(local_invocation_index) lid : u32) {
            let i = invocation_index(wid, nwg, lid);
            if (i < arrayLength(&out)) {
                out[i] = i * 3u + 1u;
                atomicAdd(&executions, 1u);
            }
        }
    ` });
    for (const [n, smallMax, expected] of [[5000, 5, [5, 4, 1]], [5000, 7, [7, 3, 1]], [70_000, 17, [17, 17, 1]]]) {
        const workgroups = workgroupsFolded(n, 256, smallMax);
        assert.deepStrictEqual(workgroups, expected, `folded grid for n=${n}, max=${smallMax}`);
        assert.ok(workgroups[1] > 1 && workgroups[0] <= smallMax && workgroups[1] <= smallMax, `n=${n} must fold within max=${smallMax}`);
        const out = compute.createStorageBuffer({ data: new Uint32Array(n).fill(0xFFFFFFFF), copySrc: true });
        const executions = compute.createStorageBuffer({ data: new Uint32Array([0]), copySrc: true });
        compute.dispatchBatch([{ pipeline, bindGroups: [pipeline.createBindGroup(0, { 0: out, 1: executions })], workgroups, label: `folded_${n}_${smallMax}` }], `folded_${n}`, { validateLimits: true });
        const values = await out.readAs(Uint32Array);
        let mismatch = -1;
        for (let i = 0; i < n && mismatch < 0; i++) if (values[i] !== ((i * 3 + 1) >>> 0)) mismatch = i;
        assert.strictEqual(mismatch, -1, `folded output mismatch for n=${n}, max=${smallMax} at ${mismatch}`);
        assert.strictEqual(await compute.readback.readScalarU32(executions), n, `every index must execute exactly once for n=${n}, max=${smallMax}`);
        out.destroy();
        executions.destroy();
    }
    const volume = compute.createPipeline({ code: `
        @group(0) @binding(0) var<storage, read_write> hits : array<atomic<u32>>;
        @compute @workgroup_size(2, 2, 2)
        fn main(@builtin(workgroup_id) wid : vec3<u32>, @builtin(num_workgroups) nwg : vec3<u32>, @builtin(local_invocation_id) lid : vec3<u32>) {
            let size = vec3<u32>(7u, 5u, 3u);
            let groups = (size + 1u) / 2u;
            let linear = wid.x + nwg.x * (wid.y + nwg.y * wid.z);
            let lz = linear / (groups.x * groups.y);
            if (lz >= groups.z) {
                return;
            }
            let p = vec3<u32>(linear % groups.x, (linear / groups.x) % groups.y, lz) * 2u + lid;
            if (all(p < size)) {
                atomicAdd(&hits[(p.z * size.y + p.y) * size.x + p.x], 1u);
            }
        }
    ` });
    const hits = compute.createStorageBuffer({ byteLength: 7 * 5 * 3 * 4, copySrc: true });
    compute.dispatchBatch([{ pipeline: volume, bindGroups: [volume.createBindGroup(0, { 0: hits })], workgroups: workgroupsFolded([7, 5, 3], [2, 2, 2], 3) }], "folded_volume", { validateLimits: true });
    assert.deepStrictEqual(Array.from(await hits.readAs(Uint32Array)), new Array(7 * 5 * 3).fill(1), "every voxel of a z-folded 3D grid must execute exactly once");
    hits.destroy();
    const raw = device.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE });
    const tooMany = Math.floor(device.limits.maxStorageBufferBindingSize / 4) + 1;
    assert.throws(() => compute.kernels.copyF32(raw, { count: tooMany }), /copyF32: a \d+-byte binding exceeds device\.limits\.maxStorageBufferBindingSize/);
    raw.destroy();
}

// 8) Cleanup releases the shared compute context before its browser GPU device.
{
    compute.destroy();
    await destroyTestDevice(device);
}
