# createSplatField#shDegree

## Summary

`createSplatField#shDegree` reports the active spherical-harmonic degree, from `0` through `3`.

## Syntax

```ts
readonly SplatField.shDegree: 0 | 1 | 2 | 3
```

## Notes

Coefficients are evaluated from the view direction in the splat's local frame. Splat rotation does not apply a Wigner-D rotation to the coefficients.

## See Also

- [createSplatField#usesSphericalHarmonics](./createsplatfield-usessphericalharmonics.md)
- [WasmGPU.createSplatField](./wasmgpu-createsplatfield.md)
