# createSplatField#setWasmSphericalHarmonics

## Summary

`setWasmSphericalHarmonics()` borrows packed SH coefficients. `refreshWasmSphericalHarmonics()` explicitly re-reads the source.

## Syntax

```ts
SplatField.setWasmSphericalHarmonics(source: WasmMemoryView<Float32Array> | null, options?: SplatFieldWasmChannelOptions): void
SplatField.refreshWasmSphericalHarmonics(options?: SplatFieldWasmRefreshOptions): void
```

## Notes

`shDegree` is required when activating an SH source unless a degree is already active. Coefficients are flattened per splat as RGB triples for all basis terms: `3`, `12`, `27`, or `48` floats for degrees 0–3. Direct color is detached, and a usable nonempty field still requires all three core transform channels.

## See Also

- [createSplatField#shDegree](./createsplatfield-shdegree.md)
- [createSplatField#setWasmColor](./createsplatfield-setwasmcolor.md)
