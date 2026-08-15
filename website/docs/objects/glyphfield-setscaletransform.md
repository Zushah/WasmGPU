# GlyphField.setScaleTransform

## Summary
GlyphField.setScaleTransform updates scale transform state on this GlyphField and marks dependent GPU data for refresh.

## Syntax
```ts
GlyphField.setScaleTransform(transform: ScaleTransformDescriptor | ScaleTransform): void
glyphField.setScaleTransform(transform);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `transform` | `ScaleTransformDescriptor \| ScaleTransform` | Yes | Scale transform descriptor/object applied by this call. |

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
### ScaleTransformDescriptor

```ts
type ScaleTransformDescriptor = {

    mode?: ScaleMode;

    clampMode?: ScaleClampMode;

    valueMode?: ScaleValueMode;

    componentCount?: number;

    componentIndex?: number;

    stride?: number;

    offset?: number;

    domainMin?: number;

    domainMax?: number;

    clampMin?: number;

    clampMax?: number;

    percentileLow?: number;

    percentileHigh?: number;

    logBase?: number;

    symlogLinThresh?: number;

    gamma?: number;

    invert?: boolean;

};
```

#### ScaleTransformDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | `ScaleMode` | No | Mode selector controlling behavior for this operation or descriptor. |
| `clampMode` | `ScaleClampMode` | No | Clamping mode used by scale transforms. |
| `valueMode` | `ScaleValueMode` | No | Value extraction mode used when mapping source data into scale inputs. |
| `componentCount` | `number` | No | Numeric input controlling `componentCount` for this operation. |
| `componentIndex` | `number` | No | Numeric input controlling `componentIndex` for this operation. |
| `stride` | `number` | No | Numeric input controlling `stride` for this operation. |
| `offset` | `number` | No | Numeric input controlling `offset` for this operation. |
| `domainMin` | `number` | No | Numeric input controlling `domainMin` for this operation. |
| `domainMax` | `number` | No | Numeric input controlling `domainMax` for this operation. |
| `clampMin` | `number` | No | Numeric input controlling `clampMin` for this operation. |
| `clampMax` | `number` | No | Numeric input controlling `clampMax` for this operation. |
| `percentileLow` | `number` | No | Numeric input controlling `percentileLow` for this operation. |

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

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const transform = { mode: "linear", domainMin: 0, domainMax: 1 };
glyphField.setScaleTransform(transform);
console.log("updated");
```

## See Also
- [GlyphField.applyScaleStats](./glyphfield-applyscalestats.md)
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
