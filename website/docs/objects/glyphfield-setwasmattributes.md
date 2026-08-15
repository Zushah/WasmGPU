# GlyphField.setWasmAttributes

## Summary

`setWasmAttributes()` borrows packed attribute records and refreshes them immediately. `refreshWasmAttributes()` explicitly re-reads the source.

## Syntax

```ts
GlyphField.setWasmAttributes(source: WasmMemoryView<Float32Array> | null, options?: GlyphFieldWasmChannelOptions): void
GlyphField.refreshWasmAttributes(options?: GlyphFieldWasmRefreshOptions): void
```

## Notes

Each instance uses four floats. Retain CPU snapshots when `getAttributeRecord()` or attribute-rich picking is required.

## See Also

- [GlyphField.getAttributeRecord](./glyphfield-getattributerecord.md)
- [GlyphField.refreshFromWasm](./glyphfield-refreshfromwasm.md)
