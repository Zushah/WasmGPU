# createGlyphField#setWasmScales

## Summary

`setWasmScales()` borrows packed scale records and refreshes them immediately. `refreshWasmScales()` explicitly re-reads the source.

## Syntax

```ts
GlyphField.setWasmScales(source: WasmMemoryView<Float32Array> | null, options?: GlyphFieldWasmChannelOptions): void
GlyphField.refreshWasmScales(options?: GlyphFieldWasmRefreshOptions): void
```

## Notes

Each instance uses `[sx, sy, sz, _]`. Options select count, managed capacity, CPU retention, and bounds recomputation; retained positions and scales (plus optional rotations) enable CPU bounds. Count must agree with other channels. Passing `null` detaches the source and destroys its managed GPU copy.

## See Also

- [createGlyphField#computeBoundsFromCPUData](./createglyphfield-computeboundsfromcpudata.md)
- [createGlyphField#refreshFromWasm](./createglyphfield-refreshfromwasm.md)
