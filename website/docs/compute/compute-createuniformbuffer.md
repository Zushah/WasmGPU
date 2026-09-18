# compute.createUniformBuffer

## Summary
compute.createUniformBuffer allocates a uniform buffer wrapper for small read-only shader parameters.
Uniform buffers are ideal for constants, configuration structs, and scalar control values.
This factory supports either explicit `byteLength` or initial `data`.
The resulting buffer can be updated later with `write` methods on the wrapper.
When `data` is supplied, its byte length takes precedence over `byteLength` and initializes the buffer. The allocation always includes `UNIFORM | COPY_DST`; extra `usage` flags are additive. Logical sizes are padded to at least four bytes and to four-byte alignment for the WebGPU allocation.

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
`UniformBuffer` - Caller-owned uniform buffer wrapper. Destroy its underlying allocation when it is no longer needed; destroying the compute service does not destroy buffers returned by this factory.

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
- [compute.createStorageBuffer](./compute-createstoragebuffer.md)
- [compute.createPipeline#createBindGroup](./compute-createpipeline-createbindgroup.md)
- [compute.createPipeline](./compute-createpipeline.md)
- [compute.dispatch](./compute-dispatch.md)
- [compute.blitRGBA8BufferToCanvas](./compute-blitrgba8buffertocanvas.md)
