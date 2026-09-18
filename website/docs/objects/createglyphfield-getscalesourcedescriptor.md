# createGlyphField#getScaleSourceDescriptor

## Summary
createGlyphField#getScaleSourceDescriptor describes the GPU attribute buffer for scale-statistics work. It returns `null` without an attribute buffer or active instances; extraction layout comes from the normalized scale transform.

## Syntax
```ts
GlyphField.getScaleSourceDescriptor(revision?: number): ScaleSourceDescriptor | null
const result = glyphField.getScaleSourceDescriptor(revision);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `revision` | `number` | No | Change token to report instead of the glyph field's current attribute revision. |

## Returns
`ScaleSourceDescriptor | null` - Scale-source descriptor for compute/stat workflows, or `null` when unavailable.

## Type Details
### ScaleSourceDescriptor

```ts
type ScaleSourceDescriptor = {

    buffer: ScaleBufferSource;

    count: number;

    componentCount?: number;

    componentIndex?: number;

    valueMode?: ScaleValueMode;

    stride?: number;

    offset?: number;

    revision?: number;

};
```

#### ScaleSourceDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `buffer` | `ScaleBufferSource` | Yes | GPUBuffer handle used as an external data source. |
| `count` | `number` | Yes | Number of logical records available to the statistics pass. |
| `componentCount` | `number` | No | Number of source components considered for each record. |
| `componentIndex` | `number` | No | Component selected when `valueMode` is `"component"`. |
| `valueMode` | `ScaleValueMode` | No | Value extraction mode used when mapping source data into scale inputs. |
| `stride` | `number` | No | Distance, in `f32` values, between consecutive records. |
| `offset` | `number` | No | Initial source offset in `f32` values. |
| `revision` | `number` | No | Change token identifying the source version represented by this descriptor. |

### ScaleBufferSource

```ts
type ScaleBufferSource = GPUBuffer | { buffer: GPUBuffer; byteLength?: number };
```

### ScaleValueMode

```ts
type ScaleValueMode = "component" | "magnitude";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const revision = 0;
const descriptor = glyphField.getScaleSourceDescriptor(revision);
console.log(descriptor?.count); // 1 after upload
```

## See Also
- [createGlyphField#applyScaleStats](./createglyphfield-applyscalestats.md)
- [createGlyphField#colormap](./createglyphfield-colormap.md)
- [createGlyphField#colormapStops](./createglyphfield-colormapstops.md)
- [createGlyphField#colorMode](./createglyphfield-colormode.md)
- [createGlyphField#computeBoundsFromCPUData](./createglyphfield-computeboundsfromcpudata.md)
- [createGlyphField#destroy](./createglyphfield-destroy.md)
- [createGlyphField#dirtyUniforms](./createglyphfield-dirtyuniforms.md)
- [createGlyphField#getAttributeRecord](./createglyphfield-getattributerecord.md)
- [createGlyphField#getBounds](./createglyphfield-getbounds.md)
- [createGlyphField#getColormapForBinding](./createglyphfield-getcolormapforbinding.md)
- [createGlyphField#getColormapKey](./createglyphfield-getcolormapkey.md)
- [createGlyphField#getLocalBounds](./createglyphfield-getlocalbounds.md)
