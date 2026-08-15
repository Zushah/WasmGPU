# Geometry.refreshWasmVertices

## Summary

`Geometry.refreshWasmVertices()` refreshes all attached vertex-attribute views after producer writes or WebAssembly memory growth.

## Syntax

```ts
Geometry.refreshWasmVertices(options?: GeometryWasmVertexRefreshOptions): void
```

## Notes

Options control active vertex count, CPU retention, authored-normal state, and bounds recomputation. `upload()` performs the GPU copy.

## See Also

- [Geometry.setWasmAttributes](./geometry-setwasmattributes.md)
- [Geometry.refreshFromWasm](./geometry-refreshfromwasm.md)
