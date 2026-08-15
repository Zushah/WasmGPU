# NodeLink.getBounds

This page documents the `NodeLink.getBounds` method.

## Summary
`NodeLink.getBounds` returns world-space bounds for the nodelink. It is the public convenience form of `NodeLink.getWorldBounds`.

## Syntax
```ts
NodeLink.getBounds(): Bounds3

const bounds = nodeLink.getBounds();
```

## Parameters
This API does not take parameters.

## Returns
`Bounds3` - World-space bounds for this nodelink.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.getLocalBounds](./nodelink-getlocalbounds.md)
- [NodeLink.getWorldBounds](./nodelink-getworldbounds.md)
- [Scene.getBounds](../world/scene-getbounds.md)
