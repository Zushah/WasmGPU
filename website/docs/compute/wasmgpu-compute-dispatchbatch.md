# WasmGPU.compute.dispatchBatch

## Summary
WasmGPU.compute.dispatchBatch encodes multiple compute dispatches into one command buffer and optionally submits it.
Use this when a workload has several sequential compute stages.
A single batch can reduce queue-submit overhead and improve trace readability.
Every workgroup tuple is validated before the compute pass begins, so an invalid later command does not leave a partially encoded batch. Validation mode additionally checks device limits.
Commands with a zero workgroup dimension are skipped.

## Syntax
```ts
WasmGPU.compute.dispatchBatch(commands: ReadonlyArray<ComputeDispatchCommand>, label?: string, opts?: ComputeDispatchOptions): GPUCommandBuffer
const commandBuffer = wgpu.compute.dispatchBatch(commands, label, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `commands` | `ReadonlyArray<ComputeDispatchCommand>` | Yes | Dispatch commands encoded in the provided order. |
| `label` | `string` | No | Optional label for the compute pass. |
| `opts` | `ComputeDispatchOptions` | No | Flags controlling submit behavior and workgroup validation. |

## Returns
`GPUCommandBuffer` - Encoded command buffer for all commands in the batch.

## Type Details
```ts
type ComputeDispatchOptions = {
    submit?: boolean;
    validateLimits?: boolean;
};

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

const storage = wgpu.compute.createStorageBuffer({ data: new Float32Array(1024), copySrc: true });
const pipeline = wgpu.compute.createPipeline({
    code: `@group(0) @binding(0) var<storage, read_write> a: array<f32>; @compute @workgroup_size(256) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { if (gid.x < 1024u) { a[gid.x] = a[gid.x] + 0.5; } }`,
    bindGroups: [{ entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }] }]
});
const bindGroup = pipeline.createBindGroup(0, { 0: storage });

wgpu.compute.dispatchBatch([
    { pipeline, bindGroups: [bindGroup], workgroups: [4, 1, 1], label: "iter-1" },
    { pipeline, bindGroups: [bindGroup], workgroups: [4, 1, 1], label: "iter-2" }
], "accumulate", { submit: true, validateLimits: true });
```

## See Also
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.dispatch1D](./wasmgpu-compute-dispatch1d.md)
- [WasmGPU.compute.encodeDispatchBatch](./wasmgpu-compute-encodedispatchbatch.md)
- [WasmGPU.compute.encodeDispatch](./wasmgpu-compute-encodedispatch.md)
- [WasmGPU.compute.workgroups1D](./wasmgpu-compute-workgroups1d.md)
