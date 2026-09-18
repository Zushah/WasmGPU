# compute.CPUndarray.zeros

## Summary
compute.CPUndarray.zeros allocates a CPU ndarray and fills its backing bytes with zero.
It has the same layout semantics as `CPUndarray.empty`.
Use this for deterministic initialization before incremental writes.
This is convenient for counters, masks, and accumulator arrays.

## Syntax
```ts
WasmGPU.compute.CPUndarray.zeros(dtype: DType, layout: NdLayoutDescriptor): CPUndarray
const a = wgpu.compute.CPUndarray.zeros(dtype, layout);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dtype` | `DType` | Yes | Element data type. |
| `layout` | `NdLayoutDescriptor` | Yes | Shape plus optional strides/offset metadata. |

## Returns
`CPUndarray` - Zero-filled CPU ndarray.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.zeros("u32", { shape: [8] });
console.log(Array.from(a.data()));
a.destroy();
```

## See Also
- [compute.CPUndarray.empty](./compute-cpundarray-empty.md)
- [compute.CPUndarray#zero_](./compute-cpundarray-zero_.md)
- [compute.CPUndarray.fromArray](./compute-cpundarray-fromarray.md)
- [compute.CPUndarray#data](./compute-cpundarray-data.md)
- [compute.CPUndarray#uploadToGPU](./compute-cpundarray-uploadtogpu.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
