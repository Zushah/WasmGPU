# compute.CPUndarray#backingBytes

## Summary
compute.CPUndarray#backingBytes returns a `Uint8Array` view of raw backing storage.
This view includes the entire allocated byte region, including non-contiguous layouts and offsets.
Use it for byte-level inspection, custom serialization, or bulk zeroing/copy logic.
For contiguous typed element access, prefer `data()`.
The returned view aliases WebAssembly memory. Discard and reacquire it after that memory grows, and do not use it after the ndarray is destroyed.

## Syntax
```ts
CPUndarray.backingBytes(): Uint8Array<ArrayBuffer>
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
- [compute.CPUndarray#data](./compute-cpundarray-data.md)
- [compute.CPUndarray#zero_](./compute-cpundarray-zero_.md)
- [compute.CPUndarray.empty](./compute-cpundarray-empty.md)
- [compute.ndarray#layout](./compute-ndarray-layout.md)
- [compute.CPUndarray#uploadToGPU](./compute-cpundarray-uploadtogpu.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
