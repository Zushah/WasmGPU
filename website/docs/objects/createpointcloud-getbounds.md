# createPointCloud#getBounds

## Summary
createPointCloud#getBounds is an alias for `getWorldBounds()`. It lazily computes local bounds when CPU point records are available, then transforms the box and sphere by the cloud's world matrix.

## Syntax
```ts
PointCloud.getBounds(): Bounds3
const result = pointCloud.getBounds();
```

## Parameters
This API does not take parameters.

## Returns
`Bounds3` - Bounds structure containing axis-aligned box and bounding-sphere data.

## Type Details
### Bounds3

```ts
type Bounds3 = {

    boxMin: Vec3;

    boxMax: Vec3;

    sphereCenter: Vec3;

    sphereRadius: number;

    empty: boolean;

    partial: boolean;

};
```

#### Bounds3 Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `boxMin` | `Vec3` | Yes | Minimum corner of the axis-aligned bounding box. |
| `boxMax` | `Vec3` | Yes | Maximum corner of the axis-aligned bounding box. |
| `sphereCenter` | `Vec3` | Yes | Center of the associated bounding sphere. |
| `sphereRadius` | `number` | Yes | Radius of the associated bounding sphere. |
| `empty` | `boolean` | Yes | Whether the bounds contain no geometry. |
| `partial` | `boolean` | Yes | Whether the result omits geometry whose bounds could not be determined. |

### Vec3

```ts
type Vec3 = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const result = pointCloud.getBounds();
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
- [createPointCloud#getColormapForBinding](./createpointcloud-getcolormapforbinding.md)
- [createPointCloud#getColormapKey](./createpointcloud-getcolormapkey.md)
- [createPointCloud#getLocalBounds](./createpointcloud-getlocalbounds.md)
- [createPointCloud#getPointRecord](./createpointcloud-getpointrecord.md)
