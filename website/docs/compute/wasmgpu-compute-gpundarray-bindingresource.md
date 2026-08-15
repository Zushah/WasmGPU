# WasmGPU.compute.GPUndarray.bindingResource

## Summary
WasmGPU.compute.GPUndarray.bindingResource returns a bindable storage-buffer resource descriptor.
The descriptor includes aligned `size` and the ndarray base offset.
Use this directly when creating bind groups for compute pipelines.
It avoids manually calculating byte ranges for wrapped ndarray views.

## Syntax
```ts
WasmGPU.compute.GPUndarray.bindingResource(): { buffer: StorageBuffer; offset: number; size: number }
const resource = g.bindingResource();
```

## Parameters
This API does not take parameters.

## Returns
`{ buffer: StorageBuffer; offset: number; size: number }` - Bind-group resource descriptor for the ndarray range.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const g = wgpu.compute.GPUndarray.empty(wgpu.gpu, "f32", { shape: [256] }, { copySrc: true });
const resource = g.bindingResource();
console.log(resource.offset, resource.size);
```

## See Also
- [WasmGPU.compute.GPUndarray.wrap](./wasmgpu-compute-gpundarray-wrap.md)
- [WasmGPU.compute.GPUndarray.empty](./wasmgpu-compute-gpundarray-empty.md)
- [WasmGPU.compute.ComputePipeline.createBindGroup](./wasmgpu-compute-computepipeline-createbindgroup.md)
- [WasmGPU.compute.GPUndarray.readbackToCPU](./wasmgpu-compute-gpundarray-readbacktocpu.md)
- [WasmGPU.compute.createPipeline](./wasmgpu-compute-createpipeline.md)
