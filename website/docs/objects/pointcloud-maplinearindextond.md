# PointCloud.mapLinearIndexToNd

## Summary
PointCloud.mapLinearIndexToNd maps values between indexing/representation schemes used by this PointCloud.

## Syntax
```ts
PointCloud.mapLinearIndexToNd(index: number): number[] | null
const result = pointCloud.mapLinearIndexToNd(index);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | `number` | Yes | Linear element index into CPU-backed arrays. |

## Returns
`number[] | null` - Result produced by this API call as `number[] | null`.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const index = 0;
const result = pointCloud.mapLinearIndexToNd(index);
console.log(result);
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
