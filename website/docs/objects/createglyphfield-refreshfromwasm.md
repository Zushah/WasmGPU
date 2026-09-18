# createGlyphField#refreshFromWasm

## Summary

`createGlyphField#refreshFromWasm()` refreshes attached channels in positions/rotations/scales/attributes order after producer writes or memory growth. It validates a shared active count, optionally snapshots CPU data/recomputes non-explicit bounds, and marks channels for later GPU upload.

## Syntax

```ts
GlyphField.refreshFromWasm(options?: GlyphFieldWasmRefreshOptions): void
```

## Notes

Refresh marks channel data dirty; `upload()` performs the GPU copy.

## See Also

- [createGlyphField#setCPUData](./createglyphfield-setcpudata.md)
- [createGlyphField#clearWasmSources](./createglyphfield-clearwasmsources.md)
