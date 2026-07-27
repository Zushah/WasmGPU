# WasmGPU.compute.CPUndarray.residency

## Summary
WasmGPU.compute.CPUndarray.residency reports where the ndarray is stored.
For CPUndarray this always returns `"cpu-webassembly"`.
Use this property in generic ndarray codepaths to choose CPU or GPU operations.
This value is read-only.

## Syntax
```ts
WasmGPU.compute.CPUndarray.residency: NdarrayResidency
const where = a.residency;
```

## Parameters
This API does not take parameters.

## Returns
`NdarrayResidency` - Always `"cpu-webassembly"` for CPUndarray.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.empty("f32", { shape: [4, 4] });
console.log(a.residency);
a.destroy();
```

## See Also
- [WasmGPU.compute.ndarray.residency](./wasmgpu-compute-ndarray-residency.md)
- [WasmGPU.compute.GPUndarray.residency](./wasmgpu-compute-gpundarray-residency.md)
- [WasmGPU.compute.CPUndarray.uploadToGPU](./wasmgpu-compute-cpundarray-uploadtogpu.md)
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.GPUndarray.readbackToCPU](./wasmgpu-compute-gpundarray-readbacktocpu.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
