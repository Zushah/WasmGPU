# createSplatField#colorSpace

## Summary

`createSplatField#colorSpace` reports the construction-time interpretation of direct RGB/RGBA or spherical-harmonic color. CPU direct RGB is converted to linear during packing; external/WebAssembly direct color and spherical-harmonic output are decoded from sRGB during rendering. The property is read-only and defaults to `"linear"`.

## Syntax

```ts
readonly SplatField.colorSpace: "linear" | "srgb"
```

## See Also

- [WasmGPU.createSplatField](./wasmgpu-createsplatfield.md)
- [createSplatField#externalColorBufferSrgb](./createsplatfield-externalcolorbuffersrgb.md)
