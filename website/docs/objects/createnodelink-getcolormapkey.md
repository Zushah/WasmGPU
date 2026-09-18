# createNodeLink#getColormapKey

This page documents the paired `NodeLink.getNodeColormapKey` and `NodeLink.getEdgeColormapKey` methods.

## Summary
These methods return opaque strings identifying the current node or edge colormap selection. Equal keys identify the same selection; do not parse or persist their format.

## Syntax
```ts
NodeLink.getNodeColormapKey(): string
NodeLink.getEdgeColormapKey(): string

const nodeKey = nodeLink.getNodeColormapKey();
const edgeKey = nodeLink.getEdgeColormapKey();
```

## Parameters
This API does not take parameters.

## Returns
`string` - Opaque identity key for the node or edge colormap selection.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#colormap](./createnodelink-colormap.md)
- [createNodeLink#colormapStops](./createnodelink-colormapstops.md)
- [createNodeLink#getColormapForBinding](./createnodelink-getcolormapforbinding.md)
