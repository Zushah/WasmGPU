# material.data#getScaleSourceDescriptor

## Summary
material.data#getScaleSourceDescriptor describes the current GPU buffer and scale-record layout for statistics work. It returns `null` until a data buffer exists and at least one record can be derived; the optional revision overrides the material's current data revision in the returned snapshot.

## Syntax
```ts
DataMaterial.getScaleSourceDescriptor(revision?: number): ScaleSourceDescriptor | null
const result = material.getScaleSourceDescriptor(revision);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `revision` | `number` | No | Change token to report instead of the material's current data revision. |

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

const material = wgpu.material.data({ data: new Float32Array([0.2, 0.4, 0.7, 1.0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" });
const revision = 0;
const descriptor = material.getScaleSourceDescriptor(revision);
console.log(descriptor?.count); // 1 after upload
```

## See Also
- [material.data#colormap](./material-data-colormap.md)
- [material.data#createBindGroupLayout](./material-data-createbindgrouplayout.md)
- [material.data#destroy](./material-data-destroy.md)
- [material.data#dropCPUData](./material-data-dropcpudata.md)
- [material.data#getColormapForBinding](./material-data-getcolormapforbinding.md)
- [material.data#getColormapKey](./material-data-getcolormapkey.md)
- [material.data#getShaderCode](./material-data-getshadercode.md)
- [material.data#getUniformBufferSize](./material-data-getuniformbuffersize.md)
- [material.data#getUniformData](./material-data-getuniformdata.md)
- [material.data#onVisualChange](./material-data-onvisualchange.md)
- [material.data#opacity](./material-data-opacity.md)
- [material.data#scaleTransform](./material-data-scaletransform.md)
