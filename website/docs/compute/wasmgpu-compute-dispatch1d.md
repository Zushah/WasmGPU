# WasmGPU.compute.dispatch1D

## Summary
WasmGPU.compute.dispatch1D dispatches a linear workload by computing workgroup counts from `invocations` and `workgroupSizeX`.
Use this helper for array-style kernels where each invocation maps to one logical element.
Internally it calls `workgroups1D` and forwards to `dispatch`.
Options control queue submission and optional device-limit validation.

## Syntax
```ts
WasmGPU.compute.dispatch1D(pipeline: GPUComputePipeline | ComputePipeline, bindGroups: ReadonlyArray<GPUBindGroup | null | undefined>, invocations: number, workgroupSizeX: number, label?: string, opts?: ComputeDispatchOptions): GPUCommandBuffer
const commandBuffer = wgpu.compute.dispatch1D(pipeline, bindGroups, invocations, workgroupSizeX, label, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `pipeline` | `GPUComputePipeline \| ComputePipeline` | Yes | Compute pipeline used for dispatch. |
| `bindGroups` | `ReadonlyArray<GPUBindGroup \| null \| undefined>` | Yes | Bind groups in pipeline layout order; nullish entries are skipped. |
| `invocations` | `number` | Yes | Total logical invocation count in 1D. |
| `workgroupSizeX` | `number` | Yes | X dimension in WGSL `@workgroup_size`. |
| `label` | `string` | No | Optional debug label. |
| `opts` | `ComputeDispatchOptions` | No | Dispatch behavior flags (`submit`, `validateLimits`). |

## Returns
`GPUCommandBuffer` - Encoded command buffer for the dispatch.

## Type Details
```ts
type ComputeDispatchOptions = {
    submit?: boolean;
    validateLimits?: boolean;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const count = 1024;
const storage = wgpu.compute.createStorageBuffer({ data: new Float32Array(count), copySrc: true });
const pipeline = wgpu.compute.createPipeline({
    code: `@group(0) @binding(0) var<storage, read_write> a: array<f32>; @compute @workgroup_size(128) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { if (gid.x < ${count}u) { a[gid.x] = f32(gid.x); } }`,
    bindGroups: [{ entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }] }]
});
const bindGroup = pipeline.createBindGroup(0, { 0: storage });

wgpu.compute.dispatch1D(pipeline, [bindGroup], count, 128, "fill-array", { submit: true, validateLimits: true });
```

## See Also
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.workgroups1D](./wasmgpu-compute-workgroups1d.md)
- [WasmGPU.compute.dispatch2D](./wasmgpu-compute-dispatch2d.md)
- [WasmGPU.compute.dispatch3D](./wasmgpu-compute-dispatch3d.md)
- [WasmGPU.compute.encodeDispatch](./wasmgpu-compute-encodedispatch.md)
