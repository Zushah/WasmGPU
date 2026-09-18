# createNodeLink#getLocalBounds

This page documents the `NodeLink.getLocalBounds` method.

## Summary
`createNodeLink#getLocalBounds` returns explicit bounds or a center-based bound derived from retained node positions. Without either source it returns empty bounds, marked partial when nodes exist. Computed bounds may underestimate visible extents because node radii, node size, and edge thickness are not included; provide explicit bounds when complete extents matter.

## Syntax
```ts
NodeLink.getLocalBounds(): Bounds3

const bounds = nodeLink.getLocalBounds();
```

## Parameters
This API does not take parameters.

## Returns
`Bounds3` - Local-space bounds for this nodelink.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#computeBoundsFromCPUData](./createnodelink-computeboundsfromcpudata.md)
- [createNodeLink#getWorldBounds](./createnodelink-getworldbounds.md)
- [createNodeLink#getBounds](./createnodelink-getbounds.md)
