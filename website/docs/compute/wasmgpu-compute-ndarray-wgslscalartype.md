# WasmGPU.compute.ndarray.wgslScalarType

## Summary
WasmGPU.compute.ndarray.wgslScalarType reports the WGSL scalar type mapping for the ndarray dtype.
Supported mappings include `"i32"`, `"u32"`, `"f32"`, and `"f64"`; unsupported byte/half-width dtypes return `null`.
Use this when generating shader code dynamically based on ndarray dtype.
This is a dtype-level property and does not depend on shape or strides.

## Syntax
```ts
WasmGPU.compute.ndarray.wgslScalarType: DTypeInfo["wgslScalarType"]
const scalarType = ndarray.wgslScalarType;
```

## Parameters
This API does not take parameters.

## Returns
`"i32" | "u32" | "f32" | "f64" | null` - WGSL scalar type for this ndarray dtype.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.empty("f32", { shape: [16] });
console.log(a.wgslScalarType);
a.destroy();
```

## See Also
- [WasmGPU.compute.ndarray.residency](./wasmgpu-compute-ndarray-residency.md)
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.GPUndarray.empty](./wasmgpu-compute-gpundarray-empty.md)
- [WasmGPU.compute.ndarray.layout](./wasmgpu-compute-ndarray-layout.md)
- [WasmGPU.compute.ndarray.ndim](./wasmgpu-compute-ndarray-ndim.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
