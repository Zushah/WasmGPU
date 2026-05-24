# NodeLink.destroy

This page documents the `NodeLink.destroy` method.

## Summary
`NodeLink.destroy` releases the nodelink's stored GPU buffers and clears runtime state. That includes pending writes, listeners, retained CPU records, counts, `ndShape`, and transform state.

Be careful with externally supplied buffers: the current `NodeLink.destroy` implementation destroys the stored node, edge, and uniform buffer fields rather than preserving them automatically.

## Syntax
```ts
NodeLink.destroy(): void

nodeLink.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No return value. The call destroys this nodelink's runtime state.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.upload](./wasmgpu-objects-nodelink-upload.md)
- [NodeLink.dropCPUData](./wasmgpu-objects-nodelink-dropcpudata.md)
- [Scene.remove](../world/wasmgpu-world-scene-remove.md)
