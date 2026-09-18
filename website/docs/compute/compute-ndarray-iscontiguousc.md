# compute.ndarray#isContiguousC

## Summary
compute.ndarray#isContiguousC reports whether an ndarray is C-contiguous row-major with zero byte offset.
This is important because some APIs (for example `CPUndarray.data()`) require contiguous layout.
Use this to decide whether fast contiguous views are available.
Non-contiguous layouts may still be valid for indexed access but not for direct packed views.

## Syntax
```ts
Ndarray.isContiguousC: boolean
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
- [compute.ndarray#layout](./compute-ndarray-layout.md)
- [compute.CPUndarray#data](./compute-cpundarray-data.md)
- [compute.CPUndarray#backingBytes](./compute-cpundarray-backingbytes.md)
- [compute.ndarray#ndim](./compute-ndarray-ndim.md)
- [compute.ndarray#residency](./compute-ndarray-residency.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
