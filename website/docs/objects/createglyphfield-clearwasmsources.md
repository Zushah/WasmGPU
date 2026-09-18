# createGlyphField#clearWasmSources

## Summary

`createGlyphField#clearWasmSources()` detaches every borrowed `WasmMemoryView` without freeing Wasm memory and destroys the field-managed GPU copies for those channels. Non-Wasm CPU arrays, legacy pointers, external buffers, count, and explicit bounds remain.

## Syntax

```ts
GlyphField.clearWasmSources(): void
```

## See Also

- [createGlyphField#refreshFromWasm](./createglyphfield-refreshfromwasm.md)
- [createGlyphField#destroy](./createglyphfield-destroy.md)
