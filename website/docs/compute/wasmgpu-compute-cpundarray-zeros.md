# WasmGPU.compute.CPUndarray.zeros

## Summary
WasmGPU.compute.CPUndarray.zeros allocates a CPU ndarray and fills its backing bytes with zero.
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
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.CPUndarray.zero_](./wasmgpu-compute-cpundarray-zero.md)
- [WasmGPU.compute.CPUndarray.fromArray](./wasmgpu-compute-cpundarray-fromarray.md)
- [WasmGPU.compute.CPUndarray.data](./wasmgpu-compute-cpundarray-data.md)
- [WasmGPU.compute.CPUndarray.uploadToGPU](./wasmgpu-compute-cpundarray-uploadtogpu.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
