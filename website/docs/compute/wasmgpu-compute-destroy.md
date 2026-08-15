# WasmGPU.compute.destroy

## Summary
WasmGPU.compute.destroy releases compute-side helpers owned by the engine compute subsystem.
It destroys the internal RGBA8 blitter (if created), readback ring, and kernel cache resources.
Call this as part of full engine teardown; `WasmGPU.destroy()` already calls it for you.
After destruction, compute operations on that instance should be considered invalid.

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

const buf = wgpu.compute.createStorageBuffer({ byteLength: 1024, copySrc: true });
console.log(buf.byteLength);

wgpu.compute.destroy();
wgpu.destroy();
```

## See Also
- [WasmGPU.destroy](../render/wasmgpu-destroy.md)
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)
- [WasmGPU.compute.createReadbackRing](./wasmgpu-compute-createreadbackring.md)
- [WasmGPU.compute.kernels.destroy](./wasmgpu-compute-kernels-destroy.md)
- [WasmGPU.compute.readback.destroy](./wasmgpu-compute-readback-destroy.md)
