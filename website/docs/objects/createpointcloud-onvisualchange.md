# createPointCloud#onVisualChange

## Summary
createPointCloud#onVisualChange registers a listener for scale, colormap, or color-mode changes and returns an idempotent unsubscribe callback. Point-size, opacity, softness, data, bounds, and transform changes do not emit these events. Listener exceptions are swallowed so one subscriber cannot interrupt updates.

## Syntax
```ts
PointCloud.onVisualChange(listener: (kind: PointCloudVisualChangeKind) => void): () => void
const result = pointCloud.onVisualChange(listener);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `(kind: PointCloudVisualChangeKind) => void` | Yes | Callback invoked when visual-relevant state changes. |

## Returns
`() => void` - Function that unsubscribes or unregisters the listener created by this call.

## Type Details
### PointCloudVisualChangeKind

```ts
type PointCloudVisualChangeKind = "scale" | "colormap" | "visual";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const listener = (kind) => console.log(kind);
const unsubscribe = pointCloud.onVisualChange(listener);
pointCloud.colormap = "magma"; // listener receives "colormap"
unsubscribe();
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
