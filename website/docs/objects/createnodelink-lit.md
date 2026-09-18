# createNodeLink#lit

This page documents the `NodeLink.lit` property.

## Summary
`createNodeLink#lit` enables or disables lighting for the nodelink's render path. It matters most when you use solid node or edge geometry such as spheres, ellipsoids, cubes, or cylinders and want those surfaces to react to scene lights.

For flatter diagnostic views, disable lighting and rely on color alone.

## Syntax
```ts
NodeLink.lit: boolean

const value = nodeLink.lit;
nodeLink.lit = true;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Whether this nodelink currently renders with lighting enabled.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#geometryMode](./createnodelink-geometrymode.md)
- [createNodeLink#opacity](./createnodelink-opacity.md)
- [createScene#lights](../world/createscene-lights.md)
