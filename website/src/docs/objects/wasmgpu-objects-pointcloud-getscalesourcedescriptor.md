# PointCloud.getScaleSourceDescriptor

## Summary
PointCloud.getScaleSourceDescriptor returns the current scale source descriptor value derived from this PointCloud runtime state.

## Syntax
```ts
PointCloud.getScaleSourceDescriptor(revision: number = this._scaleRevision): ScaleSourceDescriptor | null
const result = pointCloud.getScaleSourceDescriptor(revision);
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

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const revision = 0;
const result = pointCloud.getScaleSourceDescriptor(revision);
console.log(result);
```

## See Also
- [PointCloud.applyScaleStats](./wasmgpu-objects-pointcloud-applyscalestats.md)
- [PointCloud.basePointSize](./wasmgpu-objects-pointcloud-basepointsize.md)
- [PointCloud.colormap](./wasmgpu-objects-pointcloud-colormap.md)
- [PointCloud.colormapStops](./wasmgpu-objects-pointcloud-colormapstops.md)
- [PointCloud.computeBoundsFromCPUData](./wasmgpu-objects-pointcloud-computeboundsfromcpudata.md)
- [PointCloud.destroy](./wasmgpu-objects-pointcloud-destroy.md)
- [PointCloud.dirtyUniforms](./wasmgpu-objects-pointcloud-dirtyuniforms.md)
- [PointCloud.dropCPUData](./wasmgpu-objects-pointcloud-dropcpudata.md)
- [PointCloud.getBounds](./wasmgpu-objects-pointcloud-getbounds.md)
- [PointCloud.getColormapForBinding](./wasmgpu-objects-pointcloud-getcolormapforbinding.md)
- [PointCloud.getColormapKey](./wasmgpu-objects-pointcloud-getcolormapkey.md)
- [PointCloud.getLocalBounds](./wasmgpu-objects-pointcloud-getlocalbounds.md)
