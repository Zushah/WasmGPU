# createNodeLink#maxPointSize

This page documents the `NodeLink.maxPointSize` property.

## Summary
`createNodeLink#maxPointSize` is the upper size clamp for point-mode node rendering. It is kept at or above `NodeLink.minPointSize`.

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
- [createNodeLink#geometryMode](./createnodelink-geometrymode.md)
- [createNodeLink#minPointSize](./createnodelink-minpointsize.md)
- [createNodeLink#pointSizeAttenuation](./createnodelink-pointsizeattenuation.md)
