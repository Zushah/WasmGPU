# PointCloud.refreshFromWasm

## Summary

`PointCloud.refreshFromWasm()` refreshes the attached data and color views after producer writes or WebAssembly memory growth.

## Syntax

```ts
PointCloud.refreshFromWasm(options?: PointCloudWasmRefreshOptions): void
```

## Notes

Refresh updates view ranges and dirty state; `upload()` performs the GPU copy.

## See Also

- [PointCloud.setData](./wasmgpu-objects-pointcloud-setdata.md)
- [PointCloud.setColors](./wasmgpu-objects-pointcloud-setcolors.md)
- [PointCloud.clearWasmSources](./wasmgpu-objects-pointcloud-clearwasmsources.md)
