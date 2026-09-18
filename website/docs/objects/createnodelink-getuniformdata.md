# createNodeLink#getUniformData

This page documents the `NodeLink.getUniformData` method.

## Summary
`createNodeLink#getUniformData` creates a new 128-float (`512`-byte) snapshot of render, scale, and colormap state. It includes clamped sizes/opacity, lighting, independent node/edge transforms and modes, solid colors, point-size controls, buffer-presence flags, and up to eight custom stops per component. Mutating the returned array does not change the object.

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
- [createNodeLink#getUniformBufferSize](./createnodelink-getuniformbuffersize.md)
- [createNodeLink#dirtyUniforms](./createnodelink-dirtyuniforms.md)
- [createNodeLink#markUniformsClean](./createnodelink-markuniformsclean.md)
