# SplatField.setWasmPackedData

## Summary

`SplatField.setWasmPackedData()` updates several borrowed WebAssembly channels as one operation and then refreshes all active sources.

## Syntax

```ts
SplatField.setWasmPackedData(sources: SplatFieldWasmSources, options?: SplatFieldWasmPackedDataOptions): void
```

## Parameters

`sources` may provide `centerOpacity`, `rotation`, `scale`, `color`, and `sphericalHarmonics`; explicit `null` removes a channel. Options include `splatCount`, `capacity`, `keepCPUData`, `recomputeBounds`, and `shDegree`.

## Notes

Direct colors and SH coefficients are mutually exclusive. The three core transform channels are required for a usable field.

## See Also

- [SplatField.refreshFromWasm](./splatfield-refreshfromwasm.md)
- [SplatField.clearWasmSources](./splatfield-clearwasmsources.md)
