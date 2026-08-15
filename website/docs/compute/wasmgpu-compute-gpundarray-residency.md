# WasmGPU.compute.GPUndarray.residency

## Summary
WasmGPU.compute.GPUndarray.residency reports where GPUndarray data is stored.
For GPUndarray this always returns `"gpu-storagebuffer"`.
Use this in generic ndarray utilities that accept either CPU or GPU arrays.
This value is read-only.

## Syntax
```ts
WasmGPU.compute.GPUndarray.residency: NdarrayResidency
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
- [WasmGPU.compute.ndarray.residency](./wasmgpu-compute-ndarray-residency.md)
- [WasmGPU.compute.CPUndarray.residency](./wasmgpu-compute-cpundarray-residency.md)
- [WasmGPU.compute.GPUndarray.readbackToCPU](./wasmgpu-compute-gpundarray-readbacktocpu.md)
- [WasmGPU.compute.CPUndarray.uploadToGPU](./wasmgpu-compute-cpundarray-uploadtogpu.md)
- [WasmGPU.compute.GPUndarray.empty](./wasmgpu-compute-gpundarray-empty.md)
