# createGlyphField#setWasmAttributes

## Summary

`setWasmAttributes()` borrows packed attribute records and refreshes them immediately. `refreshWasmAttributes()` explicitly re-reads the source.

## Syntax

```ts
GlyphField.setWasmAttributes(source: WasmMemoryView<Float32Array> | null, options?: GlyphFieldWasmChannelOptions): void
GlyphField.refreshWasmAttributes(options?: GlyphFieldWasmRefreshOptions): void
```

## Notes

Each instance uses four application attributes. Options select count, managed capacity, and CPU retention. Attribute refresh increments the scale revision; retain snapshots for `getAttributeRecord()` or attribute-rich picking. Passing `null` detaches the source and destroys its managed GPU copy.

## See Also

- [createGlyphField#getAttributeRecord](./createglyphfield-getattributerecord.md)
- [createGlyphField#refreshFromWasm](./createglyphfield-refreshfromwasm.md)
