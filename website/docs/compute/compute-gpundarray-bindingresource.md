# compute.GPUndarray#bindingResource

## Summary
compute.GPUndarray#bindingResource returns a bindable storage-buffer resource descriptor.
The descriptor includes aligned `size` and the ndarray base offset.
Use this directly when creating bind groups for compute pipelines.
It avoids manually calculating byte ranges for wrapped ndarray views.

## Syntax
```ts
GPUndarray.bindingResource(): { buffer: StorageBuffer; offset: number; size: number }
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
- [compute.GPUndarray.wrap](./compute-gpundarray-wrap.md)
- [compute.GPUndarray.empty](./compute-gpundarray-empty.md)
- [compute.createPipeline#createBindGroup](./compute-createpipeline-createbindgroup.md)
- [compute.GPUndarray#readbackToCPU](./compute-gpundarray-readbacktocpu.md)
- [compute.createPipeline](./compute-createpipeline.md)
