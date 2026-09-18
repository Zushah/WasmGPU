# compute.CPUndarray#residency

## Summary
compute.CPUndarray#residency reports where the ndarray is stored.
For CPUndarray this always returns `"cpu-webassembly"`.
Use this property in generic ndarray codepaths to choose CPU or GPU operations.
This value is read-only.

## Syntax
```ts
CPUndarray.residency: NdarrayResidency
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
- [compute.ndarray#residency](./compute-ndarray-residency.md)
- [compute.GPUndarray#residency](./compute-gpundarray-residency.md)
- [compute.CPUndarray#uploadToGPU](./compute-cpundarray-uploadtogpu.md)
- [compute.CPUndarray.empty](./compute-cpundarray-empty.md)
- [compute.GPUndarray#readbackToCPU](./compute-gpundarray-readbacktocpu.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
