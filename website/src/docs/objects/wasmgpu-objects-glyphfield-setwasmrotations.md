# GlyphField.setWasmRotations

## Summary

`setWasmRotations()` borrows packed quaternion records and refreshes them immediately. `refreshWasmRotations()` explicitly re-reads the source.

## Syntax

```ts
GlyphField.setWasmRotations(source: WasmMemoryView<Float32Array> | null, options?: GlyphFieldWasmChannelOptions): void
GlyphField.refreshWasmRotations(options?: GlyphFieldWasmRefreshOptions): void
```

## Notes

Each instance uses four floats. The source is borrowed and remains owned by its producer.

## See Also

- [GlyphField.setWasmPositions](./wasmgpu-objects-glyphfield-setwasmpositions.md)
- [GlyphField.refreshFromWasm](./wasmgpu-objects-glyphfield-refreshfromwasm.md)
