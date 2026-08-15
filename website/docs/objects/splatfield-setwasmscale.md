# SplatField.setWasmScale

## Summary

`setWasmScale()` borrows packed scale records and refreshes them immediately. `refreshWasmScale()` re-reads the same source explicitly.

## Syntax

```ts
SplatField.setWasmScale(source: WasmMemoryView<Float32Array> | null, options?: SplatFieldWasmChannelOptions): void
SplatField.refreshWasmScale(options?: SplatFieldWasmRefreshOptions): void
```

## Notes

Each record uses four floats; the first three are scale components. Retained scale and center data can recompute conservative bounds.

## See Also

- [SplatField.scaleBuffer](./splatfield-scalebuffer.md)
- [SplatField.computeBoundsFromCPUData](./splatfield-computeboundsfromcpudata.md)
