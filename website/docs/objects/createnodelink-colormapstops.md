# createNodeLink#colormapStops

This page documents the paired `NodeLink.nodeColormapStops` and `NodeLink.edgeColormapStops` properties.

## Summary
These properties store the custom RGBA stop lists for node and edge scalar coloring. They are independent, so a nodelink can use one custom stop list for nodes and another for edges.

Custom stops are most useful when the matching colormap property uses `"custom"`.

## Syntax
```ts
NodeLink.nodeColormapStops: [number, number, number, number][]
NodeLink.edgeColormapStops: [number, number, number, number][]

const nodeStops = nodeLink.nodeColormapStops;
const edgeStops = nodeLink.edgeColormapStops;
```

## Parameters
This API does not take parameters.

## Returns
Reading these properties returns cloned custom stop lists for node and edge scalar coloring.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#colormap](./createnodelink-colormap.md)
- [createNodeLink#colorMode](./createnodelink-colormode.md)
- [createNodeLink#getColormapForBinding](./createnodelink-getcolormapforbinding.md)
- [colormap.fromStops](./colormap-fromstops.md)
