# createGlyphField#setScaleTransform

## Summary
createGlyphField#setScaleTransform normalizes and replaces attribute scale mapping, dirties uniforms, and emits a `"scale"` event without rewriting attribute data or changing its revision.

## Syntax
```ts
GlyphField.setScaleTransform(transform: ScaleTransformDescriptor | ScaleTransform): void
glyphField.setScaleTransform(transform);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `transform` | `ScaleTransformDescriptor \| ScaleTransform` | Yes | Scale transform descriptor/object applied by this call. |

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
| `mode` | `ScaleMode` | No | Numeric transform applied before domain normalization. |
| `clampMode` | `ScaleClampMode` | No | Clamping mode used by scale transforms. |
| `valueMode` | `ScaleValueMode` | No | Value extraction mode used when mapping source data into scale inputs. |
| `componentCount` | `number` | No | Number of components considered when extracting each value. |
| `componentIndex` | `number` | No | Selected component for `"component"` value mode. |
| `stride` | `number` | No | Distance, in `f32` values, between source records. |
| `offset` | `number` | No | Initial source offset in `f32` values. |
| `domainMin` | `number` | No | Lower bound mapped into the normalized color domain. |
| `domainMax` | `number` | No | Upper bound mapped into the normalized color domain. |
| `clampMin` | `number` | No | Lower value clamp used when clamping is enabled. |
| `clampMax` | `number` | No | Upper value clamp used when clamping is enabled. |
| `percentileLow` | `number` | No | Requested lower percentile, expressed from `0` to `100`. |

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

## See Also
- [createGlyphField#applyScaleStats](./createglyphfield-applyscalestats.md)
- [createGlyphField#scaleTransform](./createglyphfield-scaletransform.md)
- [createGlyphField#onVisualChange](./createglyphfield-onvisualchange.md)
