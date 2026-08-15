# WasmGPU.compute.GPUndarray.destroy

## Summary
WasmGPU.compute.GPUndarray.destroy releases the underlying storage buffer only when the ndarray owns it.
Arrays created by `GPUndarray.empty` are owned; arrays created by `GPUndarray.wrap` are not.
Use this to free owned GPU allocations when they are no longer needed.
Calling destroy on wrapped arrays is a safe no-op for the external buffer.

## Syntax
```ts
WasmGPU.compute.GPUndarray.destroy(): void
g.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - This method does not return a value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const g = wgpu.compute.GPUndarray.empty(wgpu.gpu, "u32", { shape: [1024] }, { copySrc: true });
g.destroy();

wgpu.destroy();
```

## See Also
- [WasmGPU.compute.GPUndarray.empty](./wasmgpu-compute-gpundarray-empty.md)
- [WasmGPU.compute.GPUndarray.wrap](./wasmgpu-compute-gpundarray-wrap.md)
- [WasmGPU.compute.GPUndarray.readbackToCPU](./wasmgpu-compute-gpundarray-readbacktocpu.md)
- [WasmGPU.compute.GPUndarray.bindingResource](./wasmgpu-compute-gpundarray-bindingresource.md)
- [WasmGPU.compute.destroy](./wasmgpu-compute-destroy.md)
