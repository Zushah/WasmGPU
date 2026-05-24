# NodeLink.size

This page documents the paired `NodeLink.nodeSize` and `NodeLink.edgeSize` properties.

## Summary
`NodeLink.nodeSize` is the global size multiplier for nodes, and `NodeLink.edgeSize` is the thickness control for edges. The two properties are independent.

Use them as coarse visual controls on top of node radii, geometry mode, and edge geometry mode.

## Syntax
```ts
NodeLink.nodeSize: number
NodeLink.edgeSize: number

const nodeSize = nodeLink.nodeSize;
const edgeSize = nodeLink.edgeSize;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Current node-size multiplier or edge-size value for this nodelink.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.geometryMode](./wasmgpu-objects-nodelink-geometrymode.md)
- [NodeLink.minPointSize](./wasmgpu-objects-nodelink-minpointsize.md)
- [NodeLink.maxPointSize](./wasmgpu-objects-nodelink-maxpointsize.md)
- [NodeLink.pointSizeAttenuation](./wasmgpu-objects-nodelink-pointsizeattenuation.md)
