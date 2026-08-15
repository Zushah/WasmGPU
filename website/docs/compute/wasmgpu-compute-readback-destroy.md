# WasmGPU.compute.readback.destroy

## Summary
WasmGPU.compute.readback.destroy releases all staging buffers owned by a readback ring.
After destruction, ring read methods should not be used.
Use this when you manually created additional rings or when tearing down long-lived compute sessions.
`WasmGPU.compute.destroy()` also destroys the default ring.

## Syntax
```ts
WasmGPU.compute.readback.destroy(): void
wgpu.compute.readback.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - This method does not return a value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const ring = wgpu.compute.createReadbackRing({ slots: 2, labelPrefix: "temp" });
ring.destroy();

wgpu.destroy();
```

## See Also
- [WasmGPU.compute.createReadbackRing](./wasmgpu-compute-createreadbackring.md)
- [WasmGPU.compute.readback.read](./wasmgpu-compute-readback-read.md)
- [WasmGPU.compute.readback.readAs](./wasmgpu-compute-readback-readas.md)
- [WasmGPU.compute.destroy](./wasmgpu-compute-destroy.md)
- [WasmGPU.destroy](../render/wasmgpu-destroy.md)
