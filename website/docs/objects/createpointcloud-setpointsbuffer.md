# createPointCloud#setPointsBuffer

## Summary
createPointCloud#setPointsBuffer replaces CPU and WebAssembly point sources with a packed external GPU buffer, sets `pointCount`, and clears computed—but not explicit—bounds. The buffer is borrowed by default; pass `{ ownBuffer: true }` to transfer destruction responsibility to the point cloud, which then destroys it on replacement or object destruction.

`pointCount` must be a positive safe integer. The buffer must contain at least that many packed `[x, y, z, scalar]` `vec4<f32>` records and have `GPUBufferUsage.STORAGE`; these are caller preconditions.

## Syntax
```ts
PointCloud.setPointsBuffer(buffer: GPUBuffer, pointCount: number, opts?: { ownBuffer?: boolean }): void
pointCloud.setPointsBuffer(buffer, pointCount, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `buffer` | `GPUBuffer` | Yes | GPUBuffer handle used as an external data source. |
| `pointCount` | `number` | Yes | Number of points represented by the supplied data source. |
| `opts` | `{ ownBuffer?: boolean }` | No | Set `ownBuffer: true` to transfer buffer destruction responsibility. |

## Returns
`void`

## See Also
- [createPointCloud#destroy](./createpointcloud-destroy.md)
- [createPointCloud#setColorsBuffer](./createpointcloud-setcolorsbuffer.md)
- [createPointCloud#setData](./createpointcloud-setdata.md)
