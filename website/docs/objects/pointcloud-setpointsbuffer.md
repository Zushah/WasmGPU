# PointCloud.setPointsBuffer

## Summary
The replacement buffer is borrowed by default. Pass `{ ownBuffer: true }` to transfer destruction responsibility to the pointcloud; replacing or destroying the object then destroys that owned buffer exactly once.
The call replaces CPU and Wasm point sources, sets `pointCount`, and clears retained point records.

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
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const buffer = somePointBuffer;
const pointCount = 2;
pointCloud.setPointsBuffer(buffer, pointCount);
```

## See Also
- [PointCloud.applyScaleStats](./pointcloud-applyscalestats.md)
- [PointCloud.basePointSize](./pointcloud-basepointsize.md)
- [PointCloud.colormap](./pointcloud-colormap.md)
- [PointCloud.colormapStops](./pointcloud-colormapstops.md)
- [PointCloud.computeBoundsFromCPUData](./pointcloud-computeboundsfromcpudata.md)
- [PointCloud.destroy](./pointcloud-destroy.md)
- [PointCloud.dirtyUniforms](./pointcloud-dirtyuniforms.md)
- [PointCloud.dropCPUData](./pointcloud-dropcpudata.md)
- [PointCloud.getBounds](./pointcloud-getbounds.md)
- [PointCloud.getColormapForBinding](./pointcloud-getcolormapforbinding.md)
- [PointCloud.getColormapKey](./pointcloud-getcolormapkey.md)
- [PointCloud.getLocalBounds](./pointcloud-getlocalbounds.md)
- [PointCloud.setColorsBuffer](./pointcloud-setcolorsbuffer.md)
