# createNodeLink#count

This page documents the paired `NodeLink.nodeCount` and `NodeLink.edgeCount` properties.

## Summary
Node and edge counts are tracked separately on a nodelink. `NodeLink.nodeCount` describes how many node records are currently available, while `NodeLink.edgeCount` describes how many edge pairs are currently available.

These counts are inferred from CPU arrays when possible. When you switch to external GPU buffers through `NodeLink.setNodePositionsBuffer` or `NodeLink.setEdgesBuffer`, you provide the corresponding count explicitly.

## Syntax
```ts
NodeLink.nodeCount: number
NodeLink.edgeCount: number

const nodes = nodeLink.nodeCount;
const edges = nodeLink.edgeCount;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Current node count or edge count for this nodelink.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#ndShape](./createnodelink-ndshape.md)
- [createNodeLink#setNodeData](./createnodelink-setnodedata.md)
- [createNodeLink#setEdgeData](./createnodelink-setedgedata.md)
- [createNodeLink#decodePickElement](./createnodelink-decodepickelement.md)
