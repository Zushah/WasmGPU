# createSplatField#setWasmScale

## Summary

`setWasmScale()` borrows packed scale records and refreshes them immediately. `refreshWasmScale()` re-reads the same source explicitly.

## Syntax

```ts
SplatField.setWasmScale(source: WasmMemoryView<Float32Array> | null, options?: SplatFieldWasmChannelOptions): void
SplatField.refreshWasmScale(options?: SplatFieldWasmRefreshOptions): void
```

## Notes

Each record is `[sx, sy, sz, _]`. Retained scale and center data can recompute conservative bounds. Use `setWasmPackedData()` for initial family replacement; passing `null` detaches this channel and destroys its managed GPU copy.

## See Also

- [createSplatField#scaleBuffer](./createsplatfield-scalebuffer.md)
- [createSplatField#computeBoundsFromCPUData](./createsplatfield-computeboundsfromcpudata.md)
