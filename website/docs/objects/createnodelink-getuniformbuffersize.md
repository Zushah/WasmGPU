# createNodeLink#getUniformBufferSize

This page documents the `NodeLink.getUniformBufferSize` method.

## Summary
`createNodeLink#getUniformBufferSize` returns the fixed nodelink uniform buffer size: `512` bytes (`128` `f32` values).

## Syntax
```ts
NodeLink.getUniformBufferSize(): number

const bytes = nodeLink.getUniformBufferSize();
```

## Parameters
This API does not take parameters.

## Returns
`number` - Uniform buffer size in bytes for this nodelink.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#getUniformData](./createnodelink-getuniformdata.md)
- [createNodeLink#dirtyUniforms](./createnodelink-dirtyuniforms.md)
