# WasmGPU.compute.CPUndarray.zero_

## Summary
WasmGPU.compute.CPUndarray.zero_ fills the ndarray backing storage with zeros in place.
It resets all represented values regardless of current layout.
Use this to reuse existing allocations without reallocating.
This operation mutates the current ndarray.

## Syntax
```ts
WasmGPU.compute.CPUndarray.zero_(): void
a.zero_();
```

## Parameters
This API does not take parameters.

## Returns
`void` - This method does not return a value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.fromArray("u32", [4], new Uint32Array([1, 2, 3, 4]));
a.zero_();
console.log(Array.from(a.data()));
a.destroy();
```

## See Also
- [WasmGPU.compute.CPUndarray.zeros](./wasmgpu-compute-cpundarray-zeros.md)
- [WasmGPU.compute.CPUndarray.backingBytes](./wasmgpu-compute-cpundarray-backingbytes.md)
- [WasmGPU.compute.CPUndarray.set](./wasmgpu-compute-cpundarray-set.md)
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.CPUndarray.uploadToGPU](./wasmgpu-compute-cpundarray-uploadtogpu.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
