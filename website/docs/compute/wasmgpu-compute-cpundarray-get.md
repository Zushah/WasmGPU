# WasmGPU.compute.CPUndarray.get

## Summary
WasmGPU.compute.CPUndarray.get reads one element by multidimensional indices.
Indices are checked against shape bounds and converted through strides/offset.
Use this for generic indexing on contiguous or strided layouts.
It returns a JavaScript number regardless of underlying dtype.

## Syntax
```ts
WasmGPU.compute.CPUndarray.get(...indices: number[]): number
const value = a.get(i0, i1, i2);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `...indices` | `number[]` | Yes | One index per dimension, in shape order. |

## Returns
`number` - Numeric value at the indexed element.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.fromArray("u32", [2, 3], new Uint32Array([10, 20, 30, 40, 50, 60]));
console.log(a.get(0, 2), a.get(1, 1));
a.destroy();
```

## See Also
- [WasmGPU.compute.CPUndarray.set](./wasmgpu-compute-cpundarray-set.md)
- [WasmGPU.compute.CPUndarray.data](./wasmgpu-compute-cpundarray-data.md)
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.ndarray.layout](./wasmgpu-compute-ndarray-layout.md)
- [WasmGPU.compute.CPUndarray.fromArray](./wasmgpu-compute-cpundarray-fromarray.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
