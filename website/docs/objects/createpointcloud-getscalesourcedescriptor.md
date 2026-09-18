# createPointCloud#getScaleSourceDescriptor

## Summary
createPointCloud#getScaleSourceDescriptor describes the active GPU point buffer to scale-statistics workflows. It returns `null` until a point buffer exists or when `pointCount` is zero. The extraction fields come from the normalized scale transform; the optional argument overrides the reported revision token.

## Syntax
```ts
PointCloud.getScaleSourceDescriptor(revision?: number): ScaleSourceDescriptor | null
const result = pointCloud.getScaleSourceDescriptor(revision);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `revision` | `number` | No | Change token to report instead of the point cloud's current data revision. |

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

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const revision = 0;
const descriptor = pointCloud.getScaleSourceDescriptor(revision);
console.log(descriptor?.count); // 2 after upload
```

## See Also
- [createPointCloud#applyScaleStats](./createpointcloud-applyscalestats.md)
- [createPointCloud#basePointSize](./createpointcloud-basepointsize.md)
- [createPointCloud#colormap](./createpointcloud-colormap.md)
- [createPointCloud#colormapStops](./createpointcloud-colormapstops.md)
- [createPointCloud#computeBoundsFromCPUData](./createpointcloud-computeboundsfromcpudata.md)
- [createPointCloud#destroy](./createpointcloud-destroy.md)
- [createPointCloud#dirtyUniforms](./createpointcloud-dirtyuniforms.md)
- [createPointCloud#dropCPUData](./createpointcloud-dropcpudata.md)
- [createPointCloud#getBounds](./createpointcloud-getbounds.md)
- [createPointCloud#getColormapForBinding](./createpointcloud-getcolormapforbinding.md)
- [createPointCloud#getColormapKey](./createpointcloud-getcolormapkey.md)
- [createPointCloud#getLocalBounds](./createpointcloud-getlocalbounds.md)
