# NodeLink.applyScaleStats

This page documents the paired `NodeLink.applyNodeScaleStats` and `NodeLink.applyEdgeScaleStats` methods.

## Summary
These methods apply statistics to the node or edge scale transform separately. They update the relevant domain values, optionally apply percentile-derived clamp values, then normalize the transform, mark uniforms dirty, bump the matching scale revision, and emit a `scale` visual-change event.

## Syntax
```ts
NodeLink.applyNodeScaleStats(stats: ScaleStatsResult): void
NodeLink.applyEdgeScaleStats(stats: ScaleStatsResult): void

nodeLink.applyNodeScaleStats(stats);
nodeLink.applyEdgeScaleStats(stats);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `stats` | `ScaleStatsResult` | Yes | Statistics result whose `min`, `max`, `percentileMin`, and `percentileMax` can update the node or edge scale transform. |

## Returns
`void` - No return value. The call updates scale-transform state on the nodelink.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.scaleTransform](./wasmgpu-objects-nodelink-scaletransform.md)
- [NodeLink.setScaleTransform](./wasmgpu-objects-nodelink-setscaletransform.md)
- [NodeLink.getScaleSourceDescriptor](./wasmgpu-objects-nodelink-getscalesourcedescriptor.md)
- [NodeLink.onVisualChange](./wasmgpu-objects-nodelink-onvisualchange.md)
