# WasmGPU.compute.ndarray.isContiguousC

## Summary
WasmGPU.compute.ndarray.isContiguousC reports whether an ndarray is C-contiguous row-major with zero byte offset.
This is important because some APIs (for example `CPUndarray.data()`) require contiguous layout.
Use this to decide whether fast contiguous views are available.
Non-contiguous layouts may still be valid for indexed access but not for direct packed views.

## Syntax
```ts
WasmGPU.compute.ndarray.isContiguousC: boolean
const contiguous = ndarray.isContiguousC;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - `true` when layout is contiguous row-major and offset is zero.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.empty("f32", { shape: [8, 8] });
console.log(a.isContiguousC);
a.destroy();
```

## See Also
- [WasmGPU.compute.ndarray.layout](./wasmgpu-compute-ndarray-layout.md)
- [WasmGPU.compute.CPUndarray.data](./wasmgpu-compute-cpundarray-data.md)
- [WasmGPU.compute.CPUndarray.backingBytes](./wasmgpu-compute-cpundarray-backingbytes.md)
- [WasmGPU.compute.ndarray.ndim](./wasmgpu-compute-ndarray-ndim.md)
- [WasmGPU.compute.ndarray.residency](./wasmgpu-compute-ndarray-residency.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
