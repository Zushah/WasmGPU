# SplatField.shDegree

## Summary

`SplatField.shDegree` reports the active spherical-harmonic degree, from `0` through `3`.

## Syntax

```ts
readonly SplatField.shDegree: 0 | 1 | 2 | 3
```

## Notes

The shader evaluates coefficients from the view direction in the splat's local frame; it does not rotate coefficients with Wigner-D matrices.

## See Also

- [SplatField.usesSphericalHarmonics](./wasmgpu-objects-splatfield-usessphericalharmonics.md)
- [WasmGPU.createSplatField](./wasmgpu-createsplatfield.md)
