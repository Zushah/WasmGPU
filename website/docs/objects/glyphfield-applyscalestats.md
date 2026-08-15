# GlyphField.applyScaleStats

## Summary
GlyphField.applyScaleStats applies computed statistics or transforms and marks affected state for update.

## Syntax
```ts
GlyphField.applyScaleStats(stats: ScaleStatsResult): void
glyphField.applyScaleStats(stats);
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

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const stats = { count: 2, finiteCount: 2, min: 0, max: 1, percentileMin: 0, percentileMax: 1, histogramBins: null };
glyphField.applyScaleStats(stats);
console.log("updated");
```

## See Also
- [GlyphField.colormap](./glyphfield-colormap.md)
- [GlyphField.colormapStops](./glyphfield-colormapstops.md)
- [GlyphField.colorMode](./glyphfield-colormode.md)
- [GlyphField.computeBoundsFromCPUData](./glyphfield-computeboundsfromcpudata.md)
- [GlyphField.destroy](./glyphfield-destroy.md)
- [GlyphField.dirtyUniforms](./glyphfield-dirtyuniforms.md)
- [GlyphField.getAttributeRecord](./glyphfield-getattributerecord.md)
- [GlyphField.getBounds](./glyphfield-getbounds.md)
- [GlyphField.getColormapForBinding](./glyphfield-getcolormapforbinding.md)
- [GlyphField.getColormapKey](./glyphfield-getcolormapkey.md)
- [GlyphField.getLocalBounds](./glyphfield-getlocalbounds.md)
- [GlyphField.getScaleSourceDescriptor](./glyphfield-getscalesourcedescriptor.md)
