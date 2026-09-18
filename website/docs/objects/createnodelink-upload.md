# createNodeLink#upload

This page documents the `NodeLink.upload` method.

## Summary
`createNodeLink#upload` copies dirty CPU and Wasm-view channels into owned storage buffers and flushes queued subrange updates. External GPU channels are used directly. Renderer integration invokes this path as needed. If `keepCPUData` is false, retained records are dropped afterward. Pending update bytes are copied when queued, so callers may reuse patch arrays before upload.

## Syntax
```ts
NodeLink.upload(device: GPUDevice, queue: GPUQueue): void

nodeLink.upload(device, queue);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device used to create node and link storage buffers when needed. |
| `queue` | `GPUQueue` | Yes | Queue used for full uploads and queued subrange writes. |

## Returns
`void` - No return value. The call uploads pending nodelink data to GPU resources.

## Example
```js
nodeLink.setNodeScalars(new Float32Array([0.2, 0.4, 0.8]));
nodeLink.updateEdges(new Uint16Array([2, 0]), 1);
nodeLink.upload(wgpu.gpu.device, wgpu.gpu.queue);
```

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#setNodeData](./createnodelink-setnodedata.md)
- [createNodeLink#setEdgeData](./createnodelink-setedgedata.md)
- [createNodeLink#dropCPUData](./createnodelink-dropcpudata.md)
- [createNodeLink#getRecord](./createnodelink-getrecord.md)
