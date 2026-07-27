# GlyphField.refreshFromWasm

## Summary

`GlyphField.refreshFromWasm()` refreshes every attached `WasmMemoryView` channel after producer writes or memory growth.

## Syntax

```ts
GlyphField.refreshFromWasm(options?: GlyphFieldWasmRefreshOptions): void
```

## Notes

Refresh marks channel data dirty; `upload()` performs the GPU copy.

## See Also

- [GlyphField.setCPUData](./wasmgpu-objects-glyphfield-setcpudata.md)
- [GlyphField.clearWasmSources](./wasmgpu-objects-glyphfield-clearwasmsources.md)
