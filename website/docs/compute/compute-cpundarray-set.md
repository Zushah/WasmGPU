# compute.CPUndarray#set

## Summary
compute.CPUndarray#set writes one element by multidimensional indices.
Indices are validated against shape and mapped through strides/offset.
Use this for element updates on arbitrary layouts.
For contiguous bulk writes, mutate the array returned by `data()` instead.

## Syntax
```ts
CPUndarray.set(value: number, ...indices: number[]): void
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
- [compute.CPUndarray#get](./compute-cpundarray-get.md)
- [compute.CPUndarray#data](./compute-cpundarray-data.md)
- [compute.CPUndarray#zero_](./compute-cpundarray-zero_.md)
- [compute.CPUndarray.empty](./compute-cpundarray-empty.md)
- [compute.ndarray#layout](./compute-ndarray-layout.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
