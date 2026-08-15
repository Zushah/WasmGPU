# NodeLink.getScaleSourceDescriptor

This page documents the paired `NodeLink.getNodeScaleSourceDescriptor` and `NodeLink.getEdgeScaleSourceDescriptor` methods.

## Summary
These methods describe the scalar buffer currently backing node or edge scale-driven visuals. The node descriptor uses the node scalar buffer, node count, and node scale revision. The edge descriptor uses the edge scalar buffer, edge count, and edge scale revision.

Either method returns `null` when the relevant scalar buffer is missing or when the matching count is zero.

## Syntax
```ts
NodeLink.getNodeScaleSourceDescriptor(revision?: number): ScaleSourceDescriptor | null
NodeLink.getEdgeScaleSourceDescriptor(revision?: number): ScaleSourceDescriptor | null

const nodeSource = nodeLink.getNodeScaleSourceDescriptor();
const edgeSource = nodeLink.getEdgeScaleSourceDescriptor();
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `revision` | `number` | No | Optional revision override. By default the node or edge scale revision on the nodelink is used. |

## Returns
`ScaleSourceDescriptor | null` - Scale-source description for the requested component, or `null` when no usable scalar source is available.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.scaleTransform](./nodelink-scaletransform.md)
- [NodeLink.setScaleTransform](./nodelink-setscaletransform.md)
- [NodeLink.applyScaleStats](./nodelink-applyscalestats.md)
- [NodeLink.setNodeData](./nodelink-setnodedata.md)
- [NodeLink.setEdgeData](./nodelink-setedgedata.md)
