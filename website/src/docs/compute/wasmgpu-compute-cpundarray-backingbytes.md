# WasmGPU.compute.CPUndarray.backingBytes

## Summary
WasmGPU.compute.CPUndarray.backingBytes returns a `Uint8Array` view of raw backing storage.
This view includes the entire allocated byte region, including non-contiguous layouts and offsets.
Use it for byte-level inspection, custom serialization, or bulk zeroing/copy logic.
For contiguous typed element access, prefer `data()`.

## Syntax
```ts
WasmGPU.compute.CPUndarray.backingBytes(): Uint8Array<ArrayBuffer>
const bytes = a.backingBytes();
```

## Parameters
This API does not take parameters.

## Returns
`Uint8Array<ArrayBuffer>` - Raw byte view over CPU ndarray backing memory.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.zeros("u16", { shape: [4] });
const bytes = a.backingBytes();
bytes[0] = 255;
console.log(bytes.byteLength, a.get(0));
a.destroy();
```

## See Also
- [WasmGPU.compute.CPUndarray.data](./wasmgpu-compute-cpundarray-data.md)
- [WasmGPU.compute.CPUndarray.zero_](./wasmgpu-compute-cpundarray-zero.md)
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.ndarray.layout](./wasmgpu-compute-ndarray-layout.md)
- [WasmGPU.compute.CPUndarray.uploadToGPU](./wasmgpu-compute-cpundarray-uploadtogpu.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
