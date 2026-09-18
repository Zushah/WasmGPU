# createGlyphField#setWasmRotations

## Summary

`setWasmRotations()` borrows packed quaternion records and refreshes them immediately. `refreshWasmRotations()` explicitly re-reads the source.

## Syntax

```ts
GlyphField.setWasmRotations(source: WasmMemoryView<Float32Array> | null, options?: GlyphFieldWasmChannelOptions): void
GlyphField.refreshWasmRotations(options?: GlyphFieldWasmRefreshOptions): void
```

## Notes

Each instance uses quaternion `[x, y, z, w]`. The source is borrowed and remains producer-owned; options select count, managed capacity, CPU retention, and bounds recomputation. Count must agree with other channels. Passing `null` detaches the source and destroys its managed GPU copy.

## See Also

- [createGlyphField#setWasmPositions](./createglyphfield-setwasmpositions.md)
- [createGlyphField#refreshFromWasm](./createglyphfield-refreshfromwasm.md)
