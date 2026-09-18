# createGlyphField#setWasmPositions

## Summary

`setWasmPositions()` borrows packed position records and refreshes them immediately. `refreshWasmPositions()` explicitly re-reads the same source.

## Syntax

```ts
GlyphField.setWasmPositions(source: WasmMemoryView<Float32Array> | null, options?: GlyphFieldWasmChannelOptions): void
GlyphField.refreshWasmPositions(options?: GlyphFieldWasmRefreshOptions): void
```

## Notes

Each instance uses `[x, y, z, _]`. Options control active count, grow-only managed GPU capacity in records, retained CPU snapshots, and bounds recomputation. The count must agree with other active channels and nonzero fields must still have rotation and scale sources. Passing `null` detaches this source and destroys its managed GPU copy.

## See Also

- [createGlyphField#setCPUData](./createglyphfield-setcpudata.md)
- [createGlyphField#refreshFromWasm](./createglyphfield-refreshfromwasm.md)
