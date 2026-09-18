# createNodeLink#computeBoundsFromCPUData

This page documents the `NodeLink.computeBoundsFromCPUData` method.

## Summary
`createNodeLink#computeBoundsFromCPUData` computes a local box around retained node positions and a sphere centered at that box's midpoint. It is a no-op without CPU positions or nodes. Node radii, node size, and edge thickness are not included, and a successful explicit call replaces previously explicit bounds with computed bounds.

## Syntax
```ts
NodeLink.computeBoundsFromCPUData(): void

nodeLink.computeBoundsFromCPUData();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No return value. The call recomputes local bounds when CPU node positions are available.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#getLocalBounds](./createnodelink-getlocalbounds.md)
- [createNodeLink#getWorldBounds](./createnodelink-getworldbounds.md)
- [createNodeLink#getBounds](./createnodelink-getbounds.md)
- [createScene#getBounds](../world/createscene-getbounds.md)
