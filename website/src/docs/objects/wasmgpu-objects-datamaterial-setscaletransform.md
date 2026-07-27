# DataMaterial.setScaleTransform

## Summary
DataMaterial.setScaleTransform updates scale transform state on this DataMaterial and marks dependent GPU data for refresh.

## Syntax
```ts
DataMaterial.setScaleTransform(transform: ScaleTransformDescriptor | ScaleTransform): void
material.setScaleTransform(transform);
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

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const transform = { mode: "linear", domainMin: 0, domainMax: 1 };
material.setScaleTransform(transform);
console.log("updated");
```

## See Also
- [DataMaterial.colormap](./wasmgpu-objects-datamaterial-colormap.md)
- [DataMaterial.createBindGroupLayout](./wasmgpu-objects-datamaterial-createbindgrouplayout.md)
- [DataMaterial.destroy](./wasmgpu-objects-datamaterial-destroy.md)
- [DataMaterial.dropCPUData](./wasmgpu-objects-datamaterial-dropcpudata.md)
- [DataMaterial.getColormapForBinding](./wasmgpu-objects-datamaterial-getcolormapforbinding.md)
- [DataMaterial.getColormapKey](./wasmgpu-objects-datamaterial-getcolormapkey.md)
- [DataMaterial.getScaleSourceDescriptor](./wasmgpu-objects-datamaterial-getscalesourcedescriptor.md)
- [DataMaterial.getShaderCode](./wasmgpu-objects-datamaterial-getshadercode.md)
- [DataMaterial.getUniformBufferSize](./wasmgpu-objects-datamaterial-getuniformbuffersize.md)
- [DataMaterial.getUniformData](./wasmgpu-objects-datamaterial-getuniformdata.md)
- [DataMaterial.onVisualChange](./wasmgpu-objects-datamaterial-onvisualchange.md)
- [DataMaterial.opacity](./wasmgpu-objects-datamaterial-opacity.md)
