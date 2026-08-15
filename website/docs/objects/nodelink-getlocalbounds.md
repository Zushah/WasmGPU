# NodeLink.getLocalBounds

This page documents the `NodeLink.getLocalBounds` method.

## Summary
`NodeLink.getLocalBounds` returns local-space bounds for the nodelink.

When no explicit bounds have been set and retained CPU node positions are still available, the method lazily computes bounds from CPU data first. If no bounds source is available at all, it returns an empty bounds value.

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
- [NodeLink.computeBoundsFromCPUData](./nodelink-computeboundsfromcpudata.md)
- [NodeLink.getWorldBounds](./nodelink-getworldbounds.md)
- [NodeLink.getBounds](./nodelink-getbounds.md)
