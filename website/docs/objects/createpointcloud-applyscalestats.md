# createPointCloud#applyScaleStats

## Summary
createPointCloud#applyScaleStats updates the current scale transform from computed statistics. Finite `min` and `max` values replace the scale domain; when both percentile bounds are non-null, they replace the clamp range. Other statistics fields are not used.

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
`void`

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
| `count` | `number` | Yes | Number of source records examined. Informational; this method does not use it. |
| `finiteCount` | `number` | Yes | Number of finite values found. Informational; this method does not use it. |
| `min` | `number` | Yes | Finite minimum to install as `domainMin`; ignored when non-finite. |
| `max` | `number` | Yes | Finite maximum to install as `domainMax`; ignored when non-finite. |
| `percentileMin` | `number \| null` | Yes | Lower clamp bound, applied only when both percentile bounds are non-null. |
| `percentileMax` | `number \| null` | Yes | Upper clamp bound, applied only when both percentile bounds are non-null. |
| `histogramBins` | `number \| null` | Yes | Histogram resolution used to produce the result; not used when applying it. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const stats = { count: 2, finiteCount: 2, min: 0, max: 1, percentileMin: 0, percentileMax: 1, histogramBins: null };
pointCloud.applyScaleStats(stats);
console.log(pointCloud.scaleTransform.domainMax); // 1
```

## See Also
- [createPointCloud#colormap](./createpointcloud-colormap.md)
- [createPointCloud#setScaleTransform](./createpointcloud-setscaletransform.md)
- [scale.requestStats](../interact/scale-requeststats.md)
