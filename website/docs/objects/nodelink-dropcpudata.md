# NodeLink.dropCPUData

This page documents the `NodeLink.dropCPUData` method.

## Summary
`NodeLink.dropCPUData` clears retained CPU node and edge records. After that, later record access and richer pick payloads may no longer be available even though GPU rendering can continue.

## Syntax
```ts
NodeLink.dropCPUData(): void

nodeLink.dropCPUData();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No return value. The call clears retained CPU-side nodelink data.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.getRecord](./nodelink-getrecord.md)
- [NodeLink.upload](./nodelink-upload.md)
- [WasmGPU.pick](../interact/wasmgpu-pick.md)
