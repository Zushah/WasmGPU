# PointCloud.setColorsBuffer

## Summary
PointCloud.setColorsBuffer replaces the optional packed RGBA color buffer. The buffer is borrowed by default; pass `{ ownBuffer: true }` to transfer destruction responsibility. Passing `null` removes the external color buffer.

The point count must already be greater than zero when a non-null buffer is supplied. The call clears retained CPU colors and detaches any Wasm color source.

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
| `buffer` | `GPUBuffer \| null` | Yes | Packed `vec4<f32>` color buffer, or `null` to remove it. |
| `opts` | `{ ownBuffer?: boolean }` | No | Set `ownBuffer: true` to transfer destruction responsibility for a non-null buffer. |

## Returns
`void`

## Example
```js
// colorBuffer is a GPUBuffer containing one RGBA tuple per point.
pointCloud.setColorsBuffer(colorBuffer, { ownBuffer: false });
```

## See Also
- [PointCloud.setPointsBuffer](./pointcloud-setpointsbuffer.md)
- [PointCloud.destroy](./pointcloud-destroy.md)
- [PointCloud.setColors](./pointcloud-setcolors.md)
