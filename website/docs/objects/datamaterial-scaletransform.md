# DataMaterial.scaleTransform

## Summary
DataMaterial.scaleTransform reads the current `scaleTransform` value from this DataMaterial instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
DataMaterial.scaleTransform: ScaleTransform
const value = material.scaleTransform;
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

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const value = material.scaleTransform;
console.log(value);
```

## See Also
- [DataMaterial.colormap](./datamaterial-colormap.md)
- [DataMaterial.createBindGroupLayout](./datamaterial-createbindgrouplayout.md)
- [DataMaterial.destroy](./datamaterial-destroy.md)
- [DataMaterial.dropCPUData](./datamaterial-dropcpudata.md)
- [DataMaterial.getColormapForBinding](./datamaterial-getcolormapforbinding.md)
- [DataMaterial.getColormapKey](./datamaterial-getcolormapkey.md)
- [DataMaterial.getScaleSourceDescriptor](./datamaterial-getscalesourcedescriptor.md)
- [DataMaterial.getShaderCode](./datamaterial-getshadercode.md)
- [DataMaterial.getUniformBufferSize](./datamaterial-getuniformbuffersize.md)
- [DataMaterial.getUniformData](./datamaterial-getuniformdata.md)
- [DataMaterial.onVisualChange](./datamaterial-onvisualchange.md)
- [DataMaterial.opacity](./datamaterial-opacity.md)
