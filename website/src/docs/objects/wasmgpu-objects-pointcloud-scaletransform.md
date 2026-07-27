# PointCloud.scaleTransform

## Summary
PointCloud.scaleTransform reads the current `scaleTransform` value from this PointCloud instance. Use it to inspect runtime state without mutating resources.

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
| `mode` | `ScaleMode` | Yes | Mode selector controlling behavior for this operation or descriptor. |
| `clampMode` | `ScaleClampMode` | Yes | Clamping mode used by scale transforms. |
| `valueMode` | `ScaleValueMode` | Yes | Value extraction mode used when mapping source data into scale inputs. |
| `componentCount` | `number` | Yes | Numeric input controlling `componentCount` for this operation. |
| `componentIndex` | `number` | Yes | Numeric input controlling `componentIndex` for this operation. |
| `stride` | `number` | Yes | Numeric input controlling `stride` for this operation. |
| `offset` | `number` | Yes | Numeric input controlling `offset` for this operation. |
| `domainMin` | `number` | Yes | Numeric input controlling `domainMin` for this operation. |
| `domainMax` | `number` | Yes | Numeric input controlling `domainMax` for this operation. |
| `clampMin` | `number` | Yes | Numeric input controlling `clampMin` for this operation. |
| `clampMax` | `number` | Yes | Numeric input controlling `clampMax` for this operation. |
| `percentileLow` | `number` | Yes | Numeric input controlling `percentileLow` for this operation. |

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
- [PointCloud.applyScaleStats](./wasmgpu-objects-pointcloud-applyscalestats.md)
- [PointCloud.basePointSize](./wasmgpu-objects-pointcloud-basepointsize.md)
- [PointCloud.colormap](./wasmgpu-objects-pointcloud-colormap.md)
- [PointCloud.colormapStops](./wasmgpu-objects-pointcloud-colormapstops.md)
- [PointCloud.computeBoundsFromCPUData](./wasmgpu-objects-pointcloud-computeboundsfromcpudata.md)
- [PointCloud.destroy](./wasmgpu-objects-pointcloud-destroy.md)
- [PointCloud.dirtyUniforms](./wasmgpu-objects-pointcloud-dirtyuniforms.md)
- [PointCloud.dropCPUData](./wasmgpu-objects-pointcloud-dropcpudata.md)
- [PointCloud.getBounds](./wasmgpu-objects-pointcloud-getbounds.md)
- [PointCloud.getColormapForBinding](./wasmgpu-objects-pointcloud-getcolormapforbinding.md)
- [PointCloud.getColormapKey](./wasmgpu-objects-pointcloud-getcolormapkey.md)
- [PointCloud.getLocalBounds](./wasmgpu-objects-pointcloud-getlocalbounds.md)
