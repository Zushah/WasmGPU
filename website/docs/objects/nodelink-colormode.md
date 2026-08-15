# NodeLink.colorMode

This page documents the paired `NodeLink.nodeColorMode` and `NodeLink.edgeColorMode` properties.

## Summary
Nodes and edges can color themselves independently. Use `rgba` when you already have per-node or per-edge RGBA data, `scalar` when you want scale-transform plus colormap mapping, and `solid` when one uniform color per component is enough.

## Syntax
```ts
NodeLink.nodeColorMode: "rgba" | "scalar" | "solid"
NodeLink.edgeColorMode: "rgba" | "scalar" | "solid"

const nodeMode = nodeLink.nodeColorMode;
const edgeMode = nodeLink.edgeColorMode;
```

## Parameters
This API does not take parameters.

## Returns
Reading these properties returns the current node and edge color modes for this nodelink.

## Type Details
- `rgba`: reads packed RGBA float colors from node or edge color data.
- `scalar`: reads node or edge scalar values, then applies the matching scale transform and colormap.
- `solid`: uses `NodeLink.nodeSolidColor` or `NodeLink.edgeSolidColor`.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.colormap](./nodelink-colormap.md)
- [NodeLink.colormapStops](./nodelink-colormapstops.md)
- [NodeLink.solidColor](./nodelink-solidcolor.md)
- [NodeLink.setNodeData](./nodelink-setnodedata.md)
- [NodeLink.setEdgeData](./nodelink-setedgedata.md)
