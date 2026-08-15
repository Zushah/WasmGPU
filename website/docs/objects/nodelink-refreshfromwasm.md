# NodeLink.refreshFromWasm

## Summary

`NodeLink.refreshFromWasm()` refreshes every attached node and edge source after producer writes or WebAssembly memory growth.

## Syntax

```ts
NodeLink.refreshFromWasm(options?: NodeLinkWasmRefreshOptions): void
```

## Notes

The combined options object has `nodes` and `edges` sub-options. Refresh marks affected GPU data dirty; `upload()` performs the copy.

## See Also

- [NodeLink.setNodeData](./nodelink-setnodedata.md)
- [NodeLink.setEdgeData](./nodelink-setedgedata.md)
- [NodeLink.clearWasmSources](./nodelink-clearwasmsources.md)
