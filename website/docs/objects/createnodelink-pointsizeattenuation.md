# createNodeLink#pointSizeAttenuation

This page documents the `NodeLink.pointSizeAttenuation` property.

## Summary
`createNodeLink#pointSizeAttenuation` controls how point-mode node size responds to distance. It is most relevant when `NodeLink.nodeGeometryMode` is `points`.

## Syntax
```ts
NodeLink.pointSizeAttenuation: number

const value = nodeLink.pointSizeAttenuation;
nodeLink.pointSizeAttenuation = 4;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Current distance-attenuation factor for point-mode nodes.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#geometryMode](./createnodelink-geometrymode.md)
- [createNodeLink#minPointSize](./createnodelink-minpointsize.md)
- [createNodeLink#maxPointSize](./createnodelink-maxpointsize.md)
