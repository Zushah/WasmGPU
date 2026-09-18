# createPointCloud#refreshFromWasm

## Summary

`createPointCloud#refreshFromWasm()` refreshes attached data and color views after producer writes or WebAssembly memory growth. Point data is refreshed first, so an optional `pointCount` becomes the active count before color validation. `keepCPUData` controls copied snapshots, while `recomputeBounds` applies only to point data and cannot override explicit bounds.

## Syntax

```ts
PointCloud.refreshFromWasm(options?: PointCloudWasmRefreshOptions): void
pointCloud.refreshFromWasm({ pointCount: 1024, keepCPUData: true, recomputeBounds: true });
```

## Notes

Refresh validates active ranges and marks the attached channels for transfer. It does not upload; `upload()` performs the GPU copy. If no corresponding WebAssembly source is attached, that channel is ignored.

## See Also

- [createPointCloud#setData](./createpointcloud-setdata.md)
- [createPointCloud#setColors](./createpointcloud-setcolors.md)
- [createPointCloud#clearWasmSources](./createpointcloud-clearwasmsources.md)
