# WasmGPU.compute.ComputePipeline.createBindGroup

## Summary
WasmGPU.compute.ComputePipeline.createBindGroup creates a bind group from high-level buffer resources.
It accepts map-style resources (`{ 0: resourceA }`) or explicit entry arrays.
Resources can be raw `GPUBuffer`, `StorageBuffer`, `UniformBuffer`, or ranged `{ buffer, offset, size }` objects.
Use this helper to simplify binding WasmGPU-managed buffers.

## Syntax
```ts
WasmGPU.compute.ComputePipeline.createBindGroup(groupIndex: number, resources: ComputeBindGroupResources, label?: string): GPUBindGroup
const bindGroup = pipeline.createBindGroup(groupIndex, resources, label);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `groupIndex` | `number` | Yes | Zero-based bind-group index to create. |
| `resources` | `ComputeBindGroupResources` | Yes | Binding resources keyed by binding index or listed as binding/resource pairs. |
| `label` | `string` | No | Optional bind-group label for debugging tools. |

## Returns
`GPUBindGroup` - Created bind group compatible with the requested pipeline group layout.

## Type Details
```ts
type BufferResource = GPUBuffer | StorageBuffer | UniformBuffer;

type BufferBindingResource =
    | BufferResource
    | { buffer: BufferResource; offset?: number; size?: number };

type ComputeBindGroupResources =
    | Record<number, BufferBindingResource>
    | Array<{ binding: number; resource: BufferBindingResource }>;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const data = wgpu.compute.createStorageBuffer({ byteLength: 1024, copySrc: true });
const params = wgpu.compute.createUniformBuffer({ data: new Float32Array([1, 0, 0, 0]) });
const pipeline = wgpu.compute.createPipeline({
    code: `@group(0) @binding(0) var<storage, read_write> a: array<f32>; @group(0) @binding(1) var<uniform> u: vec4f; @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid: vec3<u32>) { if (gid.x < 256u) { a[gid.x] = u.x; } }`,
    bindGroups: [{
        entries: [
            { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
            { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } }
        ]
    }]
});

const bindGroup = pipeline.createBindGroup(0, { 0: data, 1: params }, "main-bg");
console.log(bindGroup);
```

## See Also
- [WasmGPU.compute.ComputePipeline.getBindGroupLayout](./wasmgpu-compute-computepipeline-getbindgrouplayout.md)
- [WasmGPU.compute.createPipeline](./wasmgpu-compute-createpipeline.md)
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)
- [WasmGPU.compute.createUniformBuffer](./wasmgpu-compute-createuniformbuffer.md)
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
