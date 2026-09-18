# createNodeLink#minPointSize

This page documents the `NodeLink.minPointSize` property.

## Summary
`createNodeLink#minPointSize` is the lower size clamp for point-mode node rendering. It is most relevant when `NodeLink.nodeGeometryMode` is `points`.

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
- [createNodeLink#geometryMode](./createnodelink-geometrymode.md)
- [createNodeLink#maxPointSize](./createnodelink-maxpointsize.md)
- [createNodeLink#pointSizeAttenuation](./createnodelink-pointsizeattenuation.md)
