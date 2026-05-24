# NodeLink.maxPointSize

This page documents the `NodeLink.maxPointSize` property.

## Summary
`NodeLink.maxPointSize` is the upper size clamp for point-mode node rendering. It is kept at or above `NodeLink.minPointSize`.

## Syntax
```ts
NodeLink.maxPointSize: number

const value = nodeLink.maxPointSize;
nodeLink.maxPointSize = 24;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Current maximum point size for point-mode nodes.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.geometryMode](./wasmgpu-objects-nodelink-geometrymode.md)
- [NodeLink.minPointSize](./wasmgpu-objects-nodelink-minpointsize.md)
- [NodeLink.pointSizeAttenuation](./wasmgpu-objects-nodelink-pointsizeattenuation.md)
