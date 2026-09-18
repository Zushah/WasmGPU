# compute.GPUndarray#destroy

## Summary
compute.GPUndarray#destroy releases the underlying storage buffer only when the ndarray owns it.
Arrays created by `GPUndarray.empty` are owned; arrays created by `GPUndarray.wrap` are not.
Use this to free owned GPU allocations when they are no longer needed.
Calling destroy on wrapped arrays is a safe no-op for the external buffer.

## Syntax
```ts
GPUndarray.destroy(): void
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

const g = wgpu.compute.GPUndarray.empty(wgpu.compute, "u32", { shape: [1024] }, { copySrc: true });
g.destroy();

wgpu.destroy();
```

## See Also
- [compute.GPUndarray.empty](./compute-gpundarray-empty.md)
- [compute.GPUndarray.wrap](./compute-gpundarray-wrap.md)
- [compute.GPUndarray#readbackToCPU](./compute-gpundarray-readbacktocpu.md)
- [compute.GPUndarray#bindingResource](./compute-gpundarray-bindingresource.md)
- [compute.destroy](./compute-destroy.md)
