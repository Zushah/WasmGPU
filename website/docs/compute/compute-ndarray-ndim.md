# compute.ndarray#ndim

## Summary
compute.ndarray#ndim reports the rank (number of dimensions) of an ndarray instance.
This applies to both `CPUndarray` and `GPUndarray` because both inherit from `Ndarray`.
Use it for dimension checks and generic kernel-shape logic.
It is derived from `shape.length`.

## Syntax
```ts
Ndarray.ndim: number
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
- [compute.ndarray#layout](./compute-ndarray-layout.md)
- [compute.ndarray#isContiguousC](./compute-ndarray-iscontiguousc.md)
- [compute.CPUndarray.empty](./compute-cpundarray-empty.md)
- [compute.GPUndarray.empty](./compute-gpundarray-empty.md)
- [compute.ndarray#residency](./compute-ndarray-residency.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
