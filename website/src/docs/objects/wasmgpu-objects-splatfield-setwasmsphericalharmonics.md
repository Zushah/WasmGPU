# SplatField.setWasmSphericalHarmonics

## Summary

`setWasmSphericalHarmonics()` borrows packed SH coefficients. `refreshWasmSphericalHarmonics()` explicitly re-reads the source.

## Syntax

```ts
SplatField.setWasmSphericalHarmonics(source: WasmMemoryView<Float32Array> | null, options?: SplatFieldWasmChannelOptions): void
SplatField.refreshWasmSphericalHarmonics(options?: SplatFieldWasmRefreshOptions): void
```

## Notes

`shDegree` is required when activating an SH source unless an SH degree is already active. The coefficient count per splat is `3`, `12`, `27`, or `48` for degrees 0–3.

## See Also

- [SplatField.shDegree](./wasmgpu-objects-splatfield-shdegree.md)
- [SplatField.setWasmColor](./wasmgpu-objects-splatfield-setwasmcolor.md)
