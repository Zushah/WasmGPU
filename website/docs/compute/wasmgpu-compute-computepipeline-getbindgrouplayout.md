# WasmGPU.compute.ComputePipeline.getBindGroupLayout

## Summary
WasmGPU.compute.ComputePipeline.getBindGroupLayout returns the bind-group layout at a given index.
When explicit `bindGroups` were provided at creation time, it returns those layouts.
When creation used `layout: "auto"`, it forwards to the native pipeline layout reflection.
Use this when manually creating bind groups via `device.createBindGroup`.

## Syntax
```ts
WasmGPU.compute.ComputePipeline.getBindGroupLayout(groupIndex: number): GPUBindGroupLayout
const layout = pipeline.getBindGroupLayout(groupIndex);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `groupIndex` | `number` | Yes | Zero-based bind-group layout index. |

## Returns
`GPUBindGroupLayout` - Bind-group layout for the requested group index.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pipeline = wgpu.compute.createPipeline({
    code: `@group(0) @binding(0) var<storage, read_write> data: array<f32>; @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { if (gid.x < 64u) { data[gid.x] = 1.0; } }`
});

const layout = pipeline.getBindGroupLayout(0);
console.log(layout);
```

## See Also
- [WasmGPU.compute.ComputePipeline.createBindGroup](./wasmgpu-compute-computepipeline-createbindgroup.md)
- [WasmGPU.compute.createPipeline](./wasmgpu-compute-createpipeline.md)
- [WasmGPU.compute.dispatch1D](./wasmgpu-compute-dispatch1d.md)
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.encodeDispatch](./wasmgpu-compute-encodedispatch.md)
