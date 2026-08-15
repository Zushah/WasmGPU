# WasmGPU.compute.createUniformBuffer

## Summary
WasmGPU.compute.createUniformBuffer allocates a uniform buffer wrapper for small read-only shader parameters.
Uniform buffers are ideal for constants, configuration structs, and scalar control values.
This factory supports either explicit `byteLength` or initial `data`.
The resulting buffer can be updated later with `write` methods on the wrapper.

## Syntax
```ts
WasmGPU.compute.createUniformBuffer(desc: UniformBufferDescriptor): UniformBuffer
const uniform = wgpu.compute.createUniformBuffer(desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `desc` | `UniformBufferDescriptor` | Yes | Descriptor specifying initial bytes and optional usage flags for the uniform buffer. |

## Returns
`UniformBuffer` - Managed uniform buffer wrapper.

## Type Details
### UniformBufferDescriptor
```ts
type UniformBufferDescriptor = {
    label?: string;
    byteLength?: number;
    data?: BufferSource;
    usage?: GPUBufferUsageFlags;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const params = new Float32Array([1024, 0, 0, 0]);
const uniform = wgpu.compute.createUniformBuffer({
    label: "params",
    data: params
});

console.log(uniform.byteLength);
```

## See Also
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)
- [WasmGPU.compute.ComputePipeline.createBindGroup](./wasmgpu-compute-computepipeline-createbindgroup.md)
- [WasmGPU.compute.createPipeline](./wasmgpu-compute-createpipeline.md)
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.blitRGBA8BufferToCanvas](./wasmgpu-compute-blitrgba8buffertocanvas.md)
