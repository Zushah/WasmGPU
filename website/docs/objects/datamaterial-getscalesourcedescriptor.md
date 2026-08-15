# DataMaterial.getScaleSourceDescriptor

## Summary
DataMaterial.getScaleSourceDescriptor returns the current scale source descriptor value derived from this DataMaterial runtime state.

## Syntax
```ts
DataMaterial.getScaleSourceDescriptor(revision: number = this._scaleRevision): ScaleSourceDescriptor | null
const result = material.getScaleSourceDescriptor(revision);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `revision` | `number = this._scaleRevision` | Yes | Optional revision token for cache/scaling synchronization. |

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
| `count` | `number` | Yes | Numeric input controlling `count` for this operation. |
| `componentCount` | `number` | No | Numeric input controlling `componentCount` for this operation. |
| `componentIndex` | `number` | No | Numeric input controlling `componentIndex` for this operation. |
| `valueMode` | `ScaleValueMode` | No | Value extraction mode used when mapping source data into scale inputs. |
| `stride` | `number` | No | Numeric input controlling `stride` for this operation. |
| `offset` | `number` | No | Numeric input controlling `offset` for this operation. |
| `revision` | `number` | No | Optional revision token for cache/scaling synchronization. |

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

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const revision = 0;
const result = material.getScaleSourceDescriptor(revision);
console.log(result);
```

## See Also
- [DataMaterial.colormap](./datamaterial-colormap.md)
- [DataMaterial.createBindGroupLayout](./datamaterial-createbindgrouplayout.md)
- [DataMaterial.destroy](./datamaterial-destroy.md)
- [DataMaterial.dropCPUData](./datamaterial-dropcpudata.md)
- [DataMaterial.getColormapForBinding](./datamaterial-getcolormapforbinding.md)
- [DataMaterial.getColormapKey](./datamaterial-getcolormapkey.md)
- [DataMaterial.getShaderCode](./datamaterial-getshadercode.md)
- [DataMaterial.getUniformBufferSize](./datamaterial-getuniformbuffersize.md)
- [DataMaterial.getUniformData](./datamaterial-getuniformdata.md)
- [DataMaterial.onVisualChange](./datamaterial-onvisualchange.md)
- [DataMaterial.opacity](./datamaterial-opacity.md)
- [DataMaterial.scaleTransform](./datamaterial-scaletransform.md)
