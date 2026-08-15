# WasmGPU.compute.CPUndarray.set

## Summary
WasmGPU.compute.CPUndarray.set writes one element by multidimensional indices.
Indices are validated against shape and mapped through strides/offset.
Use this for element updates on arbitrary layouts.
For contiguous bulk writes, mutate the array returned by `data()` instead.

## Syntax
```ts
WasmGPU.compute.CPUndarray.set(value: number, ...indices: number[]): void
a.set(value, i0, i1, i2);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | `number` | Yes | Numeric value to write. |
| `...indices` | `number[]` | Yes | One index per dimension, in shape order. |

## Returns
`void` - This method does not return a value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.zeros("f32", { shape: [2, 2] });
a.set(3.14, 1, 0);
console.log(a.get(1, 0));
a.destroy();
```

## See Also
- [WasmGPU.compute.CPUndarray.get](./wasmgpu-compute-cpundarray-get.md)
- [WasmGPU.compute.CPUndarray.data](./wasmgpu-compute-cpundarray-data.md)
- [WasmGPU.compute.CPUndarray.zero_](./wasmgpu-compute-cpundarray-zero.md)
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.ndarray.layout](./wasmgpu-compute-ndarray-layout.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
