# NodeLink.colormap

This page documents the paired `NodeLink.nodeColormap` and `NodeLink.edgeColormap` properties.

## Summary
Node and edge colormaps are independent on a nodelink. Each property can hold a built-in colormap name, `"custom"`, or a `Colormap` instance.

These properties matter when the matching color mode is `scalar`.

## Syntax
```ts
NodeLink.nodeColormap: NodeLinkColormap | Colormap
NodeLink.edgeColormap: NodeLinkColormap | Colormap

const nodeColormap = nodeLink.nodeColormap;
const edgeColormap = nodeLink.edgeColormap;
```

## Parameters
This API does not take parameters.

## Returns
Reading these properties returns the current node or edge colormap selection.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.colorMode](./nodelink-colormode.md)
- [NodeLink.colormapStops](./nodelink-colormapstops.md)
- [NodeLink.getColormapKey](./nodelink-getcolormapkey.md)
- [NodeLink.getColormapForBinding](./nodelink-getcolormapforbinding.md)
