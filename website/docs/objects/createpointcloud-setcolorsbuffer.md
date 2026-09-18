# createPointCloud#setColorsBuffer

## Summary
createPointCloud#setColorsBuffer replaces the optional packed RGBA color buffer. The buffer is borrowed by default; pass `{ ownBuffer: true }` to transfer destruction responsibility. Passing `null` removes the external color buffer.

The point count must already be greater than zero when a non-null buffer is supplied. The buffer must be live, belong to the same GPU device, have at least `pointCount * 16` bytes of record capacity, and include `GPUBufferUsage.STORAGE`. The call clears retained CPU colors, detaches any Wasm color source, and destroys the previously installed color buffer only if the cloud owned it. This method does not change `colorMode`.

## Syntax
```ts
PointCloud.setColorsBuffer(
    buffer: GPUBuffer | null,
    opts?: { ownBuffer?: boolean }
): void
pointCloud.setColorsBuffer(buffer, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `buffer` | `GPUBuffer \| null` | Yes | Compatible packed `vec4<f32>` color buffer with one record per point, or `null` to remove it. |
| `opts` | `{ ownBuffer?: boolean }` | No | Set `ownBuffer: true` to transfer destruction responsibility for a non-null buffer. |

## Returns
`void`

## Example
```js
// colorBuffer is a GPUBuffer containing one RGBA tuple per point.
pointCloud.setColorsBuffer(colorBuffer, { ownBuffer: false });
```

## See Also
- [createPointCloud#setPointsBuffer](./createpointcloud-setpointsbuffer.md)
- [createPointCloud#destroy](./createpointcloud-destroy.md)
- [createPointCloud#setColors](./createpointcloud-setcolors.md)
