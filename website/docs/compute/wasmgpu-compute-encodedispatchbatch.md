# WasmGPU.compute.encodeDispatchBatch

## Summary
WasmGPU.compute.encodeDispatchBatch records multiple dispatch commands in one compute pass.
This is useful for multi-step compute workflows where one encoder should contain all stages.
It validates all workgroup tuples before beginning the pass and can additionally check them against device limits. Commands with a zero dimension are skipped.
Use this when you want fewer pass transitions and fewer queue submissions.

Kernel helpers that require native encoder operations such as `clearBuffer()` may impose additional external-encoder restrictions; consult the specific kernel page.

## Syntax
```ts
WasmGPU.compute.encodeDispatchBatch(encoder: GPUCommandEncoder, commands: ReadonlyArray<ComputeDispatchCommand>, label?: string, validateLimits?: boolean): void
wgpu.compute.encodeDispatchBatch(encoder, commands, label, validateLimits);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `encoder` | `GPUCommandEncoder` | Yes | Encoder that receives batched compute commands. |
| `commands` | `ReadonlyArray<ComputeDispatchCommand>` | Yes | Ordered dispatch commands encoded into one compute pass. |
| `label` | `string` | No | Optional label applied to the compute pass. |
| `validateLimits` | `boolean` | No | When `true`, validates each command's workgroups against device limits. |

## Returns
`void` - This method does not return a value.

## Type Details
```ts
type ComputeDispatchCommand = {
    pipeline: GPUComputePipeline | ComputePipeline;
    bindGroups?: ReadonlyArray<GPUBindGroup | null | undefined>;
    workgroups: readonly [number, number, number] | { x: number; y?: number; z?: number };
    label?: string;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const storage = wgpu.compute.createStorageBuffer({ data: new Float32Array(512), copySrc: true });
const pipeline = wgpu.compute.createPipeline({
    code: `@group(0) @binding(0) var<storage, read_write> a: array<f32>; @compute @workgroup_size(128) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { if (gid.x < 512u) { a[gid.x] = a[gid.x] + 1.0; } }`,
    bindGroups: [{ entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }] }]
});
const bindGroup = pipeline.createBindGroup(0, { 0: storage });

const encoder = wgpu.gpu.device.createCommandEncoder();
wgpu.compute.encodeDispatchBatch(encoder, [
    { pipeline, bindGroups: [bindGroup], workgroups: [4, 1, 1], label: "step-1" },
    { pipeline, bindGroups: [bindGroup], workgroups: [4, 1, 1], label: "step-2" }
], "two-step", true);
wgpu.gpu.queue.submit([encoder.finish()]);
```

## See Also
- [WasmGPU.compute.encodeDispatch](./wasmgpu-compute-encodedispatch.md)
- [WasmGPU.compute.dispatchBatch](./wasmgpu-compute-dispatchbatch.md)
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.workgroups1D](./wasmgpu-compute-workgroups1d.md)
- [WasmGPU.compute.createPipeline](./wasmgpu-compute-createpipeline.md)
