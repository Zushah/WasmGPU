# PointCloud.setColors

## Summary

`PointCloud.setColors()` installs packed CPU RGBA records. `setWasmColors()` borrows equivalent records from WebAssembly memory, and `refreshWasmColors()` explicitly re-reads that source.

## Syntax

```ts
PointCloud.setColors(data: Float32Array, options?: { keepCPUData?: boolean }): void
PointCloud.setWasmColors(source: WasmMemoryView<Float32Array> | null, options?: PointCloudWasmColorsOptions): void
PointCloud.refreshWasmColors(options?: { pointCount?: number; keepCPUData?: boolean }): void
```

## Notes

Colors contain four floats per point and must match the active point count. WebAssembly sources are borrowed; `capacity` is a grow-only managed-GPU hint. Passing `null` removes the color source.

## See Also

- [PointCloud.setColorsBuffer](./wasmgpu-objects-pointcloud-setcolorsbuffer.md)
- [PointCloud.setData](./wasmgpu-objects-pointcloud-setdata.md)
- [PointCloud.refreshFromWasm](./wasmgpu-objects-pointcloud-refreshfromwasm.md)
