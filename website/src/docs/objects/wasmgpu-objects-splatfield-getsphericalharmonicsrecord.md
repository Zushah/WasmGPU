# SplatField.getSphericalHarmonicsRecord

## Summary

`SplatField.getSphericalHarmonicsRecord()` returns one retained flat coefficient record for the active SH degree.

## Syntax

```ts
SplatField.getSphericalHarmonicsRecord(index: number): number[] | null
```

## Returns

`number[] | null` - A copy of the coefficients, or `null` when SH colors are inactive, CPU data is unavailable, or the index is invalid.

## See Also

- [SplatField.shDegree](./wasmgpu-objects-splatfield-shdegree.md)
- [SplatField.getSplatRecord](./wasmgpu-objects-splatfield-getsplatrecord.md)
