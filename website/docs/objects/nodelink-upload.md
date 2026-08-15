# NodeLink.upload

This page documents the `NodeLink.upload` method.

## Summary
`NodeLink.upload` moves dirty CPU-backed data into GPU buffers and flushes queued subrange writes. This is the step that makes recent `NodeLink.setNodeData` and `NodeLink.setEdgeData` changes render-ready.

If `keepCPUData` is `false`, `NodeLink.upload` drops retained CPU records after upload completes.

## Syntax
```ts
NodeLink.upload(device: GPUDevice, queue: GPUQueue): void

nodeLink.upload(device, queue);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device used to create or recreate internal nodelink buffers when needed. |
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
- [NodeLink.setNodeData](./nodelink-setnodedata.md)
- [NodeLink.setEdgeData](./nodelink-setedgedata.md)
- [NodeLink.dropCPUData](./nodelink-dropcpudata.md)
- [NodeLink.getRecord](./nodelink-getrecord.md)
