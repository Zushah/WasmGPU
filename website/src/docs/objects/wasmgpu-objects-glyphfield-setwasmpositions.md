# GlyphField.setWasmPositions

## Summary

`setWasmPositions()` borrows packed position records and refreshes them immediately. `refreshWasmPositions()` explicitly re-reads the same source.

## Syntax

```ts
GlyphField.setWasmPositions(source: WasmMemoryView<Float32Array> | null, options?: GlyphFieldWasmChannelOptions): void
GlyphField.refreshWasmPositions(options?: GlyphFieldWasmRefreshOptions): void
```

## Notes

Each instance uses four floats. Options control active count, managed GPU capacity, retained CPU snapshots, and bounds recomputation.

## See Also

- [GlyphField.setCPUData](./wasmgpu-objects-glyphfield-setcpudata.md)
- [GlyphField.refreshFromWasm](./wasmgpu-objects-glyphfield-refreshfromwasm.md)
