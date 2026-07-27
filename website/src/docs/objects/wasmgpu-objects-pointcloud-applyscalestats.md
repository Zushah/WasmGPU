# PointCloud.applyScaleStats

## Summary
PointCloud.applyScaleStats applies computed statistics or transforms and marks affected state for update.

## Syntax
```ts
PointCloud.applyScaleStats(stats: ScaleStatsResult): void
pointCloud.applyScaleStats(stats);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `stats` | `ScaleStatsResult` | Yes | Precomputed scale statistics used to update transform parameters. |

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
### ScaleStatsResult

```ts
type ScaleStatsResult = {

    count: number;

    finiteCount: number;

    min: number;

    max: number;

    percentileMin: number | null;

    percentileMax: number | null;

    histogramBins: number | null;

};
```

#### ScaleStatsResult Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | `number` | Yes | Numeric input controlling `count` for this operation. |
| `finiteCount` | `number` | Yes | Numeric input controlling `finiteCount` for this operation. |
| `min` | `number` | Yes | Numeric input controlling `min` for this operation. |
| `max` | `number` | Yes | Numeric input controlling `max` for this operation. |
| `percentileMin` | `number \| null` | Yes | Numeric input controlling `percentileMin` for this operation. |
| `percentileMax` | `number \| null` | Yes | Numeric input controlling `percentileMax` for this operation. |
| `histogramBins` | `number \| null` | Yes | Numeric input controlling `histogramBins` for this operation. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const stats = { count: 2, finiteCount: 2, min: 0, max: 1, percentileMin: 0, percentileMax: 1, histogramBins: null };
pointCloud.applyScaleStats(stats);
console.log("updated");
```

## See Also
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
- [PointCloud.getPointRecord](./wasmgpu-objects-pointcloud-getpointrecord.md)
