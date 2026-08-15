# NodeLink.pointSizeAttenuation

This page documents the `NodeLink.pointSizeAttenuation` property.

## Summary
`NodeLink.pointSizeAttenuation` controls how point-mode node size responds to distance. It is most relevant when `NodeLink.nodeGeometryMode` is `points`.

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
- [NodeLink.geometryMode](./nodelink-geometrymode.md)
- [NodeLink.minPointSize](./nodelink-minpointsize.md)
- [NodeLink.maxPointSize](./nodelink-maxpointsize.md)
