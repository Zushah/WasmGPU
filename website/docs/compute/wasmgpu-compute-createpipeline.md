# WasmGPU.compute.createPipeline

## Summary
WasmGPU.compute.createPipeline builds a compute pipeline from WGSL source and optional explicit bind-group layouts.
Use explicit `bindGroups` when you want deterministic layouts and predictable bind-group creation across browsers.
If `bindGroups` is omitted, the pipeline is created with `layout: "auto"`.
The returned `ComputePipeline` wrapper also exposes helpers for bind-group creation.

## Syntax
```ts
WasmGPU.compute.createPipeline(desc: ComputePipelineDescriptor): ComputePipeline
const pipeline = wgpu.compute.createPipeline(desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `desc` | `ComputePipelineDescriptor` | Yes | Pipeline definition including WGSL code, entry point, constants, and optional explicit bind-group layouts. |

## Returns
`ComputePipeline` - Wrapper around the created `GPUComputePipeline` plus bind-group helper methods.

## Type Details
### ComputePipelineDescriptor
```ts
type ComputePipelineDescriptor = {
    label?: string;
    code: string;
    entryPoint?: string;
    constants?: Record<string, number>;
    bindGroups?: BindGroupLayoutDescriptor[];
};
```

### BindGroupLayoutDescriptor
```ts
type BindGroupLayoutDescriptor = {
    label?: string;
    entries: GPUBindGroupLayoutEntry[];
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pipeline = wgpu.compute.createPipeline({
    label: "double-values",
    code: `
    @group(0) @binding(0) var<storage, read_write> data: array<f32>;
    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let i = gid.x;
        if (i < 1024u) { data[i] = data[i] * 2.0; }
    }`,
    bindGroups: [{
        entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }]
    }]
});
console.log(pipeline);
```

## See Also
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.dispatch1D](./wasmgpu-compute-dispatch1d.md)
- [WasmGPU.compute.encodeDispatch](./wasmgpu-compute-encodedispatch.md)
- [WasmGPU.compute.ComputePipeline.createBindGroup](./wasmgpu-compute-computepipeline-createbindgroup.md)
- [WasmGPU.compute.ComputePipeline.getBindGroupLayout](./wasmgpu-compute-computepipeline-getbindgrouplayout.md)
- [WasmGPU.webgpu.bindGroupLayout](../interop/wasmgpu-webgpu-bindgrouplayout.md)
