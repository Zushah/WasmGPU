# compute.ndarray#wgslScalarType

## Summary
compute.ndarray#wgslScalarType reports the WGSL scalar type mapping for the ndarray dtype.
Supported mappings are `"i32"`, `"u32"`, and `"f32"`. The `f64` dtype is available for CPU/Wasm math but is not WGSL-bindable and returns `null`, as do byte and half-width dtypes.
Use this when generating shader code dynamically based on ndarray dtype.
This is a dtype-level property and does not depend on shape or strides.

## Syntax
```ts
Ndarray.wgslScalarType: DTypeInfo["wgslScalarType"]
const scalarType = ndarray.wgslScalarType;
```

## Parameters
This API does not take parameters.

## Returns
`"i32" | "u32" | "f32" | null` - WGSL scalar type for this ndarray dtype.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.empty("f32", { shape: [16] });
console.log(a.wgslScalarType);
a.destroy();
```

## See Also
- [compute.ndarray#residency](./compute-ndarray-residency.md)
- [compute.CPUndarray.empty](./compute-cpundarray-empty.md)
- [compute.GPUndarray.empty](./compute-gpundarray-empty.md)
- [compute.ndarray#layout](./compute-ndarray-layout.md)
- [compute.ndarray#ndim](./compute-ndarray-ndim.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
