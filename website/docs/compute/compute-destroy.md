# compute.destroy

## Summary
compute.destroy releases compute-side helpers owned by the engine compute subsystem.
It destroys compute-service-owned RGBA8 blit, default readback, and built-in-kernel resources.
Call this as part of full engine teardown; `WasmGPU.destroy()` already calls it for you.
It does not destroy storage buffers, uniform buffers, pipelines, GPU ndarrays, or additional readback rings returned by compute factories; those resources remain caller-owned. Compute APIs must not be reused after destruction.

## Syntax
```ts
WasmGPU.compute.destroy(): void
wgpu.compute.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - This method does not return a value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const buf = wgpu.compute.createStorageBuffer({ byteLength: 1024 });
buf.destroy(); // Caller-owned resource.
wgpu.destroy();
```

## See Also
- [WasmGPU.destroy](../render/wasmgpu-destroy.md)
- [compute.createStorageBuffer](./compute-createstoragebuffer.md)
- [compute.createReadbackRing](./compute-createreadbackring.md)
- [compute.kernels.destroy](./compute-kernels-destroy.md)
- [compute.readback.destroy](./compute-readback-destroy.md)
