# createNodeLink#refreshFromWasm

## Summary

`createNodeLink#refreshFromWasm()` refreshes attached node channels first, then edge channels, after producer writes or WebAssembly memory growth. Node and edge counts are independent; all attached channels on the same side must cover the resulting count. Position refresh alone can recompute non-explicit bounds.

## Syntax

```ts
NodeLink.refreshFromWasm(options?: NodeLinkWasmRefreshOptions): void
```

## Notes

The options are flat: `nodeCount`, `edgeCount`, `keepCPUData`, and `recomputeBounds`. Refresh marks data for transfer; `upload()` performs the copy. WebAssembly edges are packed `u32` pairs. Every endpoint must be a valid node index; validate producer data before refreshing.

## See Also

- [createNodeLink#setNodeData](./createnodelink-setnodedata.md)
- [createNodeLink#setEdgeData](./createnodelink-setedgedata.md)
- [createNodeLink#clearWasmSources](./createnodelink-clearwasmsources.md)
