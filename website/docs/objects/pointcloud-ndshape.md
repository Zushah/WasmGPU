# PointCloud.ndShape

## Summary
PointCloud.ndShape reads the current `ndShape` value from this PointCloud instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
PointCloud.ndShape: number[] | null
const value = pointCloud.ndShape;
```

## Parameters
This API does not take parameters.

## Returns
`number[] | null` - Current accessor value exposed by the runtime object.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const value = pointCloud.ndShape;
console.log(value);
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
