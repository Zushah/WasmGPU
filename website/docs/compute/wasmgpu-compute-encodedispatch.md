# WasmGPU.compute.encodeDispatch

## Summary
WasmGPU.compute.encodeDispatch records one compute dispatch into an existing command encoder.
Use this when you want compute commands inside a broader command buffer with other passes.
It accepts either a raw `GPUComputePipeline` or a WasmGPU `ComputePipeline` wrapper.
Enable validation to assert workgroup counts against device limits before encoding.

## Syntax
```ts
WasmGPU.compute.encodeDispatch(encoder: GPUCommandEncoder, cmd: ComputeDispatchCommand, validateLimits?: boolean): void
wgpu.compute.encodeDispatch(encoder, cmd, validateLimits);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `encoder` | `GPUCommandEncoder` | Yes | Encoder that receives the compute pass commands. |
| `cmd` | `ComputeDispatchCommand` | Yes | Pipeline, bind groups, workgroup counts, and optional label. |
| `validateLimits` | `boolean` | No | When `true`, validates workgroup counts against device limits before dispatch encoding. |

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

const storage = wgpu.compute.createStorageBuffer({ data: new Float32Array(256), copySrc: true });
const pipeline = wgpu.compute.createPipeline({
    code: `@group(0) @binding(0) var<storage, read_write> a: array<f32>; @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { if (gid.x < 256u) { a[gid.x] = f32(gid.x); } }`,
    bindGroups: [{ entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }] }]
});
const bindGroup = pipeline.createBindGroup(0, { 0: storage });

const encoder = wgpu.gpu.device.createCommandEncoder();
wgpu.compute.encodeDispatch(encoder, { pipeline, bindGroups: [bindGroup], workgroups: [4, 1, 1], label: "fill" }, true);
wgpu.gpu.queue.submit([encoder.finish()]);
```

## See Also
- [WasmGPU.compute.encodeDispatchBatch](./wasmgpu-compute-encodedispatchbatch.md)
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.dispatchBatch](./wasmgpu-compute-dispatchbatch.md)
- [WasmGPU.compute.workgroups1D](./wasmgpu-compute-workgroups1d.md)
- [WasmGPU.compute.createPipeline](./wasmgpu-compute-createpipeline.md)
