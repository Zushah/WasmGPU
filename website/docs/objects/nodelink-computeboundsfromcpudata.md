# NodeLink.computeBoundsFromCPUData

This page documents the `NodeLink.computeBoundsFromCPUData` method.

## Summary
`NodeLink.computeBoundsFromCPUData` computes local bounds from retained CPU node positions. It is a no-op when CPU node positions are unavailable or when `NodeLink.nodeCount` is zero.

This is the direct way to refresh bounds when you keep CPU node data and want bounds to follow it.

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
- [NodeLink.getLocalBounds](./nodelink-getlocalbounds.md)
- [NodeLink.getWorldBounds](./nodelink-getworldbounds.md)
- [NodeLink.getBounds](./nodelink-getbounds.md)
- [Scene.getBounds](../world/scene-getbounds.md)
