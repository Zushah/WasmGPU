# createPointCloud#dropCPUData

## Summary
createPointCloud#dropCPUData discards retained CPU point and color snapshots without changing point count, GPU buffers, WebAssembly source bindings, or bounds already computed. Afterward `getPointRecord()` returns `null` until a retained snapshot is supplied or refreshed again.

## Syntax
```ts
PointCloud.dropCPUData(): void
pointCloud.dropCPUData();
```

## Parameters
None.

## Returns
`void`

## See Also
- [createPointCloud#destroy](./createpointcloud-destroy.md)
- [createPointCloud#getPointRecord](./createpointcloud-getpointrecord.md)
- [createPointCloud#setData](./createpointcloud-setdata.md)
- [createPointCloud#upload](./createpointcloud-upload.md)
