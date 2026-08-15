# WasmGPU.compute.CPUndarray.fromArray

## Summary
WasmGPU.compute.CPUndarray.fromArray creates a contiguous CPU ndarray from JavaScript array-like data.
It allocates by shape and copies source values into wasm memory.
Use this for quick conversion of host arrays/typed arrays into WasmGPU ndarray format.
Source length must be at least the ndarray element count.

## Syntax
```ts
WasmGPU.compute.CPUndarray.fromArray<T extends ArrayLike<number>>(dtype: DType, shape: ReadonlyArray<number>, src: T): CPUndarray
const a = wgpu.compute.CPUndarray.fromArray(dtype, shape, src);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dtype` | `DType` | Yes | Destination element data type. |
| `shape` | `ReadonlyArray<number>` | Yes | Output ndarray dimensions. |
| `src` | `ArrayLike<number>` | Yes | Source numeric data copied into the new ndarray. |

## Returns
`CPUndarray` - Contiguous CPU ndarray populated from source data.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const src = new Float32Array([1, 2, 3, 4, 5, 6]);
const a = wgpu.compute.CPUndarray.fromArray("f32", [2, 3], src);
console.log(a.get(1, 2));
a.destroy();
```

## See Also
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.CPUndarray.zeros](./wasmgpu-compute-cpundarray-zeros.md)
- [WasmGPU.compute.CPUndarray.data](./wasmgpu-compute-cpundarray-data.md)
- [WasmGPU.compute.CPUndarray.get](./wasmgpu-compute-cpundarray-get.md)
- [WasmGPU.compute.CPUndarray.uploadToGPU](./wasmgpu-compute-cpundarray-uploadtogpu.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
