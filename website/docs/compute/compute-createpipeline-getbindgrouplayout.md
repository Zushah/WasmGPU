# compute.createPipeline#getBindGroupLayout

## Summary
compute.createPipeline#getBindGroupLayout returns the bind-group layout at a given index.
When explicit `bindGroups` were provided at creation time, it returns those layouts.
When creation used `layout: "auto"`, it forwards to the native pipeline layout reflection.
Use this when manually creating bind groups via `device.createBindGroup`.

## Syntax
```ts
ComputePipeline.getBindGroupLayout(groupIndex: number): GPUBindGroupLayout
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
- [compute.createPipeline#createBindGroup](./compute-createpipeline-createbindgroup.md)
- [compute.createPipeline](./compute-createpipeline.md)
- [compute.dispatch1D](./compute-dispatch1d.md)
- [compute.dispatch](./compute-dispatch.md)
- [compute.encodeDispatch](./compute-encodedispatch.md)
