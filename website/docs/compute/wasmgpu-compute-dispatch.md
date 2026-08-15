# WasmGPU.compute.dispatch

## Summary
WasmGPU.compute.dispatch records one compute command into a fresh command encoder and optionally submits it.
Use this when you already have explicit workgroup counts and want a direct high-level call.
Set `opts.submit` to `false` to return an unsubmitted `GPUCommandBuffer`.
Set `opts.validateLimits` to check workgroup counts against device limits before encoding.

## Syntax
```ts
WasmGPU.compute.dispatch(cmd: ComputeDispatchCommand, opts?: ComputeDispatchOptions): GPUCommandBuffer
const commandBuffer = wgpu.compute.dispatch(cmd, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `cmd` | `ComputeDispatchCommand` | Yes | Dispatch command including pipeline, bind groups, and workgroup counts. |
| `opts` | `ComputeDispatchOptions` | No | Flags for auto-submit and limit validation behavior. |

## Returns
`GPUCommandBuffer` - Encoded command buffer containing the dispatch.

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

const storage = wgpu.compute.createStorageBuffer({ data: new Float32Array(128), copySrc: true });
const pipeline = wgpu.compute.createPipeline({
    code: `@group(0) @binding(0) var<storage, read_write> a: array<f32>; @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { if (gid.x < 128u) { a[gid.x] = a[gid.x] + 2.0; } }`,
    bindGroups: [{ entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }] }]
});
const bindGroup = pipeline.createBindGroup(0, { 0: storage });

wgpu.compute.dispatch({ pipeline, bindGroups: [bindGroup], workgroups: [2, 1, 1], label: "plus-two" }, { submit: true, validateLimits: true });
```

## See Also
- [WasmGPU.compute.dispatch1D](./wasmgpu-compute-dispatch1d.md)
- [WasmGPU.compute.dispatch2D](./wasmgpu-compute-dispatch2d.md)
- [WasmGPU.compute.dispatch3D](./wasmgpu-compute-dispatch3d.md)
- [WasmGPU.compute.dispatchBatch](./wasmgpu-compute-dispatchbatch.md)
- [WasmGPU.compute.encodeDispatch](./wasmgpu-compute-encodedispatch.md)
