# NodeLink.minPointSize

This page documents the `NodeLink.minPointSize` property.

## Summary
`NodeLink.minPointSize` is the lower size clamp for point-mode node rendering. It is most relevant when `NodeLink.nodeGeometryMode` is `points`.

## Syntax
```ts
NodeLink.minPointSize: number

const value = nodeLink.minPointSize;
nodeLink.minPointSize = 2;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Current minimum point size for point-mode nodes.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.geometryMode](./wasmgpu-objects-nodelink-geometrymode.md)
- [NodeLink.maxPointSize](./wasmgpu-objects-nodelink-maxpointsize.md)
- [NodeLink.pointSizeAttenuation](./wasmgpu-objects-nodelink-pointsizeattenuation.md)
