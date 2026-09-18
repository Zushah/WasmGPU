# createGlyphField#scaleTransform

## Summary
createGlyphField#scaleTransform returns a cloned normalized attribute mapping. Mutating it has no effect; use `setScaleTransform()`. Omitted layout fields default to four components, component zero, stride four, and offset zero.

## Syntax
```ts
GlyphField.scaleTransform: ScaleTransform
const value = glyphField.scaleTransform;
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

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const value = glyphField.scaleTransform;
console.log(value);
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
