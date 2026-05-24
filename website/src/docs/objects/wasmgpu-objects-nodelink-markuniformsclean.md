# NodeLink.markUniformsClean

This page documents the `NodeLink.markUniformsClean` method.

## Summary
`NodeLink.markUniformsClean` clears the nodelink's uniform dirty flag. Renderer and other internal runtime code use it after uniform data has been consumed.

Most application code only needs to read `NodeLink.dirtyUniforms`.

## Syntax
```ts
NodeLink.markUniformsClean(): void

nodeLink.markUniformsClean();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No return value. The call clears the uniform dirty flag on this nodelink.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.dirtyUniforms](./wasmgpu-objects-nodelink-dirtyuniforms.md)
- [NodeLink.getUniformData](./wasmgpu-objects-nodelink-getuniformdata.md)
- [NodeLink.onVisualChange](./wasmgpu-objects-nodelink-onvisualchange.md)
