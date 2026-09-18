# compute.GPUndarray#residency

## Summary
compute.GPUndarray#residency reports where GPUndarray data is stored.
For GPUndarray this always returns `"gpu-storagebuffer"`.
Use this in generic ndarray utilities that accept either CPU or GPU arrays.
This value is read-only.

## Syntax
```ts
GPUndarray.residency: NdarrayResidency
const where = g.residency;
```

## Parameters
This API does not take parameters.

## Returns
`NdarrayResidency` - Always `"gpu-storagebuffer"` for GPUndarray.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const g = wgpu.compute.GPUndarray.empty(wgpu.gpu, "f32", { shape: [16] }, { copySrc: true });
console.log(g.residency);
```

## See Also
- [compute.ndarray#residency](./compute-ndarray-residency.md)
- [compute.CPUndarray#residency](./compute-cpundarray-residency.md)
- [compute.GPUndarray#readbackToCPU](./compute-gpundarray-readbacktocpu.md)
- [compute.CPUndarray#uploadToGPU](./compute-cpundarray-uploadtogpu.md)
- [compute.GPUndarray.empty](./compute-gpundarray-empty.md)
