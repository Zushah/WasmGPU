# GlyphField.setWasmScales

## Summary

`setWasmScales()` borrows packed scale records and refreshes them immediately. `refreshWasmScales()` explicitly re-reads the source.

## Syntax

```ts
GlyphField.setWasmScales(source: WasmMemoryView<Float32Array> | null, options?: GlyphFieldWasmChannelOptions): void
GlyphField.refreshWasmScales(options?: GlyphFieldWasmRefreshOptions): void
```

## Notes

Each instance uses four floats. Retained position and scale data can recompute bounds.

## See Also

- [GlyphField.computeBoundsFromCPUData](./wasmgpu-objects-glyphfield-computeboundsfromcpudata.md)
- [GlyphField.refreshFromWasm](./wasmgpu-objects-glyphfield-refreshfromwasm.md)
