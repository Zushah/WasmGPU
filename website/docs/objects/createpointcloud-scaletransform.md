# createPointCloud#scaleTransform

## Summary
createPointCloud#scaleTransform returns a cloned snapshot of the normalized scalar mapping. Mutating the snapshot has no effect; use `setScaleTransform()` to replace it. Point clouds default omitted extraction fields to four components, component index `3`, stride `4`, and offset `0`.

## Syntax
```ts
PointCloud.scaleTransform: ScaleTransform
const value = pointCloud.scaleTransform;
```

## Parameters
This API does not take parameters.

## Returns
`ScaleTransform` - Normalized scale-transform snapshot currently active on this object.

## Type Details
### ScaleTransform

```ts
type ScaleTransform = {

    mode: ScaleMode;

    clampMode: ScaleClampMode;

    valueMode: ScaleValueMode;

    componentCount: number;

    componentIndex: number;

    stride: number;

    offset: number;

    domainMin: number;

    domainMax: number;

    clampMin: number;

    clampMax: number;

    percentileLow: number;

    percentileHigh: number;

    logBase: number;

    symlogLinThresh: number;

    gamma: number;

    invert: boolean;

};
```

#### ScaleTransform Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | `ScaleMode` | Yes | Numeric transform applied before domain normalization. |
| `clampMode` | `ScaleClampMode` | Yes | Clamping mode used by scale transforms. |
| `valueMode` | `ScaleValueMode` | Yes | Value extraction mode used when mapping source data into scale inputs. |
| `componentCount` | `number` | Yes | Number of components considered when extracting each value. |
| `componentIndex` | `number` | Yes | Selected component for `"component"` value mode. |
| `stride` | `number` | Yes | Distance, in `f32` values, between source records. |
| `offset` | `number` | Yes | Initial source offset in `f32` values. |
| `domainMin` | `number` | Yes | Lower bound mapped into the normalized color domain. |
| `domainMax` | `number` | Yes | Upper bound mapped into the normalized color domain. |
| `clampMin` | `number` | Yes | Lower value clamp used when clamping is enabled. |
| `clampMax` | `number` | Yes | Upper value clamp used when clamping is enabled. |
| `percentileLow` | `number` | Yes | Requested lower percentile, expressed from `0` to `100`. |

### ScaleMode

```ts
type ScaleMode = "linear" | "log" | "symlog";
```

### ScaleClampMode

```ts
type ScaleClampMode = "none" | "range" | "percentile";
```

### ScaleValueMode

```ts
type ScaleValueMode = "component" | "magnitude";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const value = pointCloud.scaleTransform;
console.log(value);
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
- [createPointCloud#getColormapKey](./createpointcloud-getcolormapkey.md)
- [createPointCloud#getLocalBounds](./createpointcloud-getlocalbounds.md)
