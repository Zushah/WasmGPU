# NodeLink.dirtyUniforms

This page documents the `NodeLink.dirtyUniforms` property.

## Summary
`NodeLink.dirtyUniforms` reports whether the nodelink's uniform-backed render state needs to be refreshed. Changes to visual properties, size, opacity, lighting, scale transforms, or colormaps can set this flag.

## Syntax
```ts
NodeLink.dirtyUniforms: boolean

const dirty = nodeLink.dirtyUniforms;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Whether the nodelink's uniform state is currently marked dirty.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.markUniformsClean](./nodelink-markuniformsclean.md)
- [NodeLink.getUniformData](./nodelink-getuniformdata.md)
- [NodeLink.onVisualChange](./nodelink-onvisualchange.md)
