# createNodeLink#solidColor

This page documents the paired `NodeLink.nodeSolidColor` and `NodeLink.edgeSolidColor` properties.

## Summary
These properties store the uniform node and edge colors used when the matching color mode is `solid`. The two colors are independent, so a nodelink can render nodes and edges with different fixed colors.

## Syntax
```ts
NodeLink.nodeSolidColor: [number, number, number, number]
NodeLink.edgeSolidColor: [number, number, number, number]

const nodeColor = nodeLink.nodeSolidColor;
const edgeColor = nodeLink.edgeSolidColor;
```

## Parameters
This API does not take parameters.

## Returns
Reading these properties returns the current node or edge solid RGBA color.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#colorMode](./createnodelink-colormode.md)
- [createNodeLink#colormap](./createnodelink-colormap.md)
- [createNodeLink#getUniformData](./createnodelink-getuniformdata.md)
