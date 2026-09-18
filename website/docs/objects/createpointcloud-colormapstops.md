# createPointCloud#colormapStops

## Summary
createPointCloud#colormapStops gets or sets the stops used when `colormap` is `"custom"`. Assignment copies and normalizes the list to two through eight RGBA stops, repeating the last supplied stop when fewer than two are given and truncating extras. It marks uniforms dirty and emits a `"colormap"` event.

## Syntax
```ts
PointCloud.colormapStops: ReadonlyArray<Color4>
const value = pointCloud.colormapStops;
pointCloud.colormapStops = [[0, 0, 0, 1], [1, 0.5, 0, 1]];
```

## Parameters
This API does not take parameters.

## Returns
`ReadonlyArray<Color4>` - The normalized stop list retained by the point cloud. Treat the returned array and tuples as read-only; assign a new list to apply changes.

## Type Details
### Color4

```ts
type Color4 = [number, number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const value = pointCloud.colormapStops;
console.log(value);
```

## See Also
- [createPointCloud#applyScaleStats](./createpointcloud-applyscalestats.md)
- [createPointCloud#basePointSize](./createpointcloud-basepointsize.md)
- [createPointCloud#colormap](./createpointcloud-colormap.md)
- [createPointCloud#computeBoundsFromCPUData](./createpointcloud-computeboundsfromcpudata.md)
- [createPointCloud#destroy](./createpointcloud-destroy.md)
- [createPointCloud#dirtyUniforms](./createpointcloud-dirtyuniforms.md)
- [createPointCloud#dropCPUData](./createpointcloud-dropcpudata.md)
- [createPointCloud#getBounds](./createpointcloud-getbounds.md)
- [createPointCloud#getColormapForBinding](./createpointcloud-getcolormapforbinding.md)
- [createPointCloud#getColormapKey](./createpointcloud-getcolormapkey.md)
- [createPointCloud#getLocalBounds](./createpointcloud-getlocalbounds.md)
- [createPointCloud#getPointRecord](./createpointcloud-getpointrecord.md)
