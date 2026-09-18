# createPointCloud#setColors

## Summary

`createPointCloud#setColors()` installs packed CPU RGBA records. It validates exactly four floats per active point, copies the input immediately, detaches any Wasm color source, and schedules a GPU upload. `setWasmColors()` instead borrows equivalent records, and `refreshWasmColors()` explicitly re-reads that source.

## Syntax

```ts
PointCloud.setColors(data: Float32Array, options?: { keepCPUData?: boolean }): void
PointCloud.setWasmColors(source: WasmMemoryView<Float32Array> | null, options?: PointCloudWasmColorsOptions): void
PointCloud.refreshWasmColors(options?: { pointCount?: number; keepCPUData?: boolean }): void
```

## Notes

Colors contain four floats per point and must match the active point count. `keepCPUData` controls whether the copied snapshot survives upload; until upload, the snapshot is necessarily retained. WebAssembly sources are borrowed; `capacity` is a grow-only managed-GPU record-capacity hint. Passing `null` detaches the Wasm source and destroys its cloud-managed GPU copy. None of these methods changes `colorMode`; set `pointCloud.colorMode = "rgba"` when replacing colors on an existing scalar cloud.

## See Also

- [createPointCloud#setColorsBuffer](./createpointcloud-setcolorsbuffer.md)
- [createPointCloud#setData](./createpointcloud-setdata.md)
- [createPointCloud#refreshFromWasm](./createpointcloud-refreshfromwasm.md)
