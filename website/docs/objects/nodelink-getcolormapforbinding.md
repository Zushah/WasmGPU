# NodeLink.getColormapForBinding

This page documents the paired `NodeLink.getNodeColormapForBinding` and `NodeLink.getEdgeColormapForBinding` methods.

## Summary
These methods resolve the colormap resource that renderer and legend binding code should use for node or edge scalar coloring.

If the current node or edge colormap is already a `Colormap` instance, that instance is returned. If it is a built-in name, the matching built-in colormap is returned. If it is `"custom"`, binding resolves through a grayscale colormap while the custom stop colors continue to come from the nodelink's own stop list and uniform data.

## Syntax
```ts
NodeLink.getNodeColormapForBinding(): Colormap
NodeLink.getEdgeColormapForBinding(): Colormap

const nodeColormap = nodeLink.getNodeColormapForBinding();
const edgeColormap = nodeLink.getEdgeColormapForBinding();
```

## Parameters
This API does not take parameters.

## Returns
`Colormap` - Resolved colormap resource used for node or edge binding.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.colormap](./nodelink-colormap.md)
- [NodeLink.colormapStops](./nodelink-colormapstops.md)
- [NodeLink.getColormapKey](./nodelink-getcolormapkey.md)
- [WasmGPU.createOverlay.legend](../world/wasmgpu-createoverlay-legend.md)
