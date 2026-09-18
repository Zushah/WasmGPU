# createNodeLink#getBounds

This page documents the `NodeLink.getBounds` method.

## Summary
`createNodeLink#getBounds` returns world-space bounds for the nodelink. It is the public convenience form of `NodeLink.getWorldBounds`.

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
- [createNodeLink#getLocalBounds](./createnodelink-getlocalbounds.md)
- [createNodeLink#getWorldBounds](./createnodelink-getworldbounds.md)
- [createScene#getBounds](../world/createscene-getbounds.md)
