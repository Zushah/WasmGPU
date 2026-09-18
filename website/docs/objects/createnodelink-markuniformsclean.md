# createNodeLink#markUniformsClean

This page documents the `NodeLink.markUniformsClean` method.

## Summary
`createNodeLink#markUniformsClean` clears the nodelink's uniform dirty flag. Custom integrations can call it after consuming `getUniformData()`.

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
- [createNodeLink#dirtyUniforms](./createnodelink-dirtyuniforms.md)
- [createNodeLink#getUniformData](./createnodelink-getuniformdata.md)
- [createNodeLink#onVisualChange](./createnodelink-onvisualchange.md)
