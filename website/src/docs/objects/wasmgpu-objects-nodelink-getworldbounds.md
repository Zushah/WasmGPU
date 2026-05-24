# NodeLink.getWorldBounds

This page documents the `NodeLink.getWorldBounds` method.

## Summary
`NodeLink.getWorldBounds` returns world-space bounds for the nodelink. It applies the current transform to the local bounds before returning the result.

## Syntax
```ts
NodeLink.getWorldBounds(): Bounds3

const bounds = nodeLink.getWorldBounds();
```

## Parameters
This API does not take parameters.

## Returns
`Bounds3` - World-space bounds for this nodelink.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.getLocalBounds](./wasmgpu-objects-nodelink-getlocalbounds.md)
- [NodeLink.getBounds](./wasmgpu-objects-nodelink-getbounds.md)
- [Scene.getBounds](../world/wasmgpu-world-scene-getbounds.md)
