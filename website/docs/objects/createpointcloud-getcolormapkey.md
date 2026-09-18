# createPointCloud#getColormapKey

## Summary
createPointCloud#getColormapKey returns an opaque string identifying the selected colormap. Equal keys identify the same selection; do not parse or persist their format.

## Syntax
```ts
PointCloud.getColormapKey(): string
const result = pointCloud.getColormapKey();
```

## Parameters
This API does not take parameters.

## Returns
`string` - String result produced by this operation.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const result = pointCloud.getColormapKey();
console.log(result);
```

## See Also
- [createPointCloud#applyScaleStats](./createpointcloud-applyscalestats.md)
- [createPointCloud#basePointSize](./createpointcloud-basepointsize.md)
- [createPointCloud#colormap](./createpointcloud-colormap.md)
- [createPointCloud#colormapStops](./createpointcloud-colormapstops.md)
- [createPointCloud#computeBoundsFromCPUData](./createpointcloud-computeboundsfromcpudata.md)
- [createPointCloud#destroy](./createpointcloud-destroy.md)
- [createPointCloud#dirtyUniforms](./createpointcloud-dirtyuniforms.md)
- [createPointCloud#dropCPUData](./createpointcloud-dropcpudata.md)
- [createPointCloud#getBounds](./createpointcloud-getbounds.md)
- [createPointCloud#getColormapForBinding](./createpointcloud-getcolormapforbinding.md)
- [createPointCloud#getLocalBounds](./createpointcloud-getlocalbounds.md)
- [createPointCloud#getPointRecord](./createpointcloud-getpointrecord.md)
