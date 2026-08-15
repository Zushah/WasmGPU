# NodeLink.getUniformData

This page documents the `NodeLink.getUniformData` method.

## Summary
`NodeLink.getUniformData` packs the current nodelink render, scale, and colormap state into uniform data ready for upload.

The packed data includes object-level size, opacity, lighting, node and edge scale transforms, node and edge color-mode state, solid colors, point-size controls, and custom node or edge colormap stops.

## Syntax
```ts
NodeLink.getUniformData(): Float32Array

const uniformData = nodeLink.getUniformData();
```

## Parameters
This API does not take parameters.

## Returns
`Float32Array` - Packed uniform data for the current nodelink state.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.getUniformBufferSize](./nodelink-getuniformbuffersize.md)
- [NodeLink.dirtyUniforms](./nodelink-dirtyuniforms.md)
- [NodeLink.markUniformsClean](./nodelink-markuniformsclean.md)
