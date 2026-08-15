# Geometry.setWasmIndices

## Summary

`setWasmIndices()` borrows packed `u32` triangle indices and refreshes them immediately. `refreshWasmIndices()` explicitly re-reads the source.

## Syntax

```ts
Geometry.setWasmIndices(source: WasmMemoryView<Uint32Array> | null, options?: GeometryWasmIndexOptions): void
Geometry.refreshWasmIndices(options?: GeometryWasmIndexRefreshOptions): void
```

## Notes

Options control active `indexCount`, grow-only managed GPU capacity, and CPU retention. Passing `null` returns the geometry to a non-indexed source configuration.

## See Also

- [Geometry.indexBuffer](./geometry-indexbuffer.md)
- [Geometry.isIndexed](./geometry-isindexed.md)
