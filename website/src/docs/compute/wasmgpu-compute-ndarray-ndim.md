# WasmGPU.compute.ndarray.ndim

## Summary
WasmGPU.compute.ndarray.ndim reports the rank (number of dimensions) of an ndarray instance.
This applies to both `CPUndarray` and `GPUndarray` because both inherit from `Ndarray`.
Use it for dimension checks and generic kernel-shape logic.
It is derived from `shape.length`.

## Syntax
```ts
WasmGPU.compute.ndarray.ndim: number
const rank = ndarray.ndim;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Number of dimensions in the ndarray shape.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.empty("f32", { shape: [64, 32, 8] });
console.log(a.ndim);
a.destroy();
```

## See Also
- [WasmGPU.compute.ndarray.layout](./wasmgpu-compute-ndarray-layout.md)
- [WasmGPU.compute.ndarray.isContiguousC](./wasmgpu-compute-ndarray-iscontiguousc.md)
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.GPUndarray.empty](./wasmgpu-compute-gpundarray-empty.md)
- [WasmGPU.compute.ndarray.residency](./wasmgpu-compute-ndarray-residency.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
