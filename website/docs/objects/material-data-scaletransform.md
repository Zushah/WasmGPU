# material.data#scaleTransform

## Summary
material.data#scaleTransform returns a clone of the normalized scale descriptor used to extract and map values. Mutating the returned object has no effect; use `setScaleTransform()` to update the material and recompute its record count.

## Syntax
```ts
DataMaterial.scaleTransform: ScaleTransform
const value = material.scaleTransform;
```

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

## See Also
- [material.data#getScaleSourceDescriptor](./material-data-getscalesourcedescriptor.md)
- [material.data#setScaleTransform](./material-data-setscaletransform.md)
