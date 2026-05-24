# NodeLink.getColormapKey

This page documents the paired `NodeLink.getNodeColormapKey` and `NodeLink.getEdgeColormapKey` methods.

## Summary
These methods return the colormap key strings used to identify node or edge colormap binding state. The key is derived from the selected built-in colormap name or from the `Colormap.id` of a supplied `Colormap` instance.

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
`string` - Colormap cache key for the node or edge colormap selection.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.colormap](./wasmgpu-objects-nodelink-colormap.md)
- [NodeLink.colormapStops](./wasmgpu-objects-nodelink-colormapstops.md)
- [NodeLink.getColormapForBinding](./wasmgpu-objects-nodelink-getcolormapforbinding.md)
