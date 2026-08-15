# NodeLink.destroy

This page documents the `NodeLink.destroy` method.

## Summary
`NodeLink.destroy` releases the nodelink's stored GPU buffers and clears runtime state. That includes pending writes, listeners, retained CPU records, counts, `ndShape`, and transform state.
Externally supplied node or edge buffers are destroyed only when ownership was transferred with descriptor `ownBuffers: true` or setter option `ownBuffer: true`.
Borrowed external buffers are detached without being destroyed; the internally created uniform buffer is always object-owned.

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
- [NodeLink.upload](./nodelink-upload.md)
- [NodeLink.dropCPUData](./nodelink-dropcpudata.md)
- [Scene.remove](../world/scene-remove.md)
