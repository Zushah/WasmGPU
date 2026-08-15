# NodeLink.getUniformBufferSize

This page documents the `NodeLink.getUniformBufferSize` method.

## Summary
`NodeLink.getUniformBufferSize` returns the nodelink uniform buffer size in bytes.

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
- [NodeLink.getUniformData](./nodelink-getuniformdata.md)
- [NodeLink.dirtyUniforms](./nodelink-dirtyuniforms.md)
