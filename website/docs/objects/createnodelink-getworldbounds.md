# createNodeLink#getWorldBounds

This page documents the `NodeLink.getWorldBounds` method.

## Summary
`createNodeLink#getWorldBounds` returns world-space bounds for the nodelink. It applies the current transform to the local bounds before returning the result.

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
- [createNodeLink#getLocalBounds](./createnodelink-getlocalbounds.md)
- [createNodeLink#getBounds](./createnodelink-getbounds.md)
- [createScene#getBounds](../world/createscene-getbounds.md)
