# createGlyphField#applyScaleStats

## Summary
createGlyphField#applyScaleStats updates the normalized attribute scale from statistics: finite extrema replace the domain, and a complete percentile pair replaces the clamp range. It marks uniforms dirty and emits a `"scale"` event.

## Syntax
```ts
GlyphField.applyScaleStats(stats: ScaleStatsResult): void
glyphField.applyScaleStats(stats);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `stats` | `ScaleStatsResult` | Yes | Precomputed scale statistics used to update transform parameters. |

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

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const stats = { count: 2, finiteCount: 2, min: 0, max: 1, percentileMin: 0, percentileMax: 1, histogramBins: null };
glyphField.applyScaleStats(stats);
console.log(glyphField.scaleTransform.domainMin, glyphField.scaleTransform.domainMax); // 0, 1
```

## See Also
- [createGlyphField#getScaleSourceDescriptor](./createglyphfield-getscalesourcedescriptor.md)
- [createGlyphField#scaleTransform](./createglyphfield-scaletransform.md)
- [createGlyphField#setScaleTransform](./createglyphfield-setscaletransform.md)
