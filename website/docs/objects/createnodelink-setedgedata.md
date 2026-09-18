# createNodeLink#setEdgeData

This page documents these edge-data APIs:

- `NodeLink.setEdges`
- `NodeLink.updateEdges`
- `NodeLink.setEdgesBuffer`
- `NodeLink.setEdgeScalars`
- `NodeLink.updateEdgeScalars`
- `NodeLink.setEdgeScalarsBuffer`
- `NodeLink.setEdgeColors`
- `NodeLink.updateEdgeColors`
- `NodeLink.setEdgeColorsBuffer`
- `NodeLink.setWasmEdges`
- `NodeLink.refreshWasmEdges`
- `NodeLink.setWasmEdgeScalars`
- `NodeLink.refreshWasmEdgeScalars`
- `NodeLink.setWasmEdgeColors`
- `NodeLink.refreshWasmEdgeColors`

## Summary
These methods update edge-side data on a nodelink.

- `NodeLink.setEdges` and `NodeLink.updateEdges` use source/destination node-index pairs.
- CPU-backed edges can be `Uint16Array` or `Uint32Array`.
- Edge scalar length must match `NodeLink.edgeCount`.
- Edge colors are RGBA float data with four components per edge.
- GPU-buffer setters replace CPU-backed data for that category.
- GPU buffers are borrowed by default. Pass `{ ownBuffer: true }` to a GPU-buffer setter to transfer destruction responsibility for that replacement.
- Update methods patch subranges and validate bounds before writing.

## Syntax
```ts
NodeLink.setEdges(data: Uint16Array | Uint32Array, opts?: { keepCPUData?: boolean }): void
NodeLink.updateEdges(data: Uint16Array | Uint32Array, startEdge?: number): void
NodeLink.setEdgesBuffer(buffer: GPUBuffer, edgeCount: number, opts?: { ownBuffer?: boolean }): void

NodeLink.setEdgeScalars(data: Float32Array, opts?: { keepCPUData?: boolean }): void
NodeLink.updateEdgeScalars(data: Float32Array, startEdge?: number): void
NodeLink.setEdgeScalarsBuffer(buffer: GPUBuffer | null, opts?: { ownBuffer?: boolean }): void

NodeLink.setEdgeColors(data: Float32Array, opts?: { keepCPUData?: boolean }): void
NodeLink.updateEdgeColors(data: Float32Array, startEdge?: number): void
NodeLink.setEdgeColorsBuffer(buffer: GPUBuffer | null, opts?: { ownBuffer?: boolean }): void

NodeLink.setWasmEdges(source: WasmMemoryView<Uint32Array> | null, options?: NodeLinkWasmEdgeChannelOptions): void
NodeLink.refreshWasmEdges(options?: NodeLinkWasmEdgeRefreshOptions): void
NodeLink.setWasmEdgeScalars(source: WasmMemoryView<Float32Array> | null, options?: NodeLinkWasmEdgeChannelOptions): void
NodeLink.refreshWasmEdgeScalars(options?: NodeLinkWasmEdgeRefreshOptions): void
NodeLink.setWasmEdgeColors(source: WasmMemoryView<Float32Array> | null, options?: NodeLinkWasmEdgeChannelOptions): void
NodeLink.refreshWasmEdgeColors(options?: NodeLinkWasmEdgeRefreshOptions): void
```

WebAssembly channel setters borrow memory and refresh immediately. Their matching refresh methods re-read the source after producer writes or memory growth. Wasm edges are `u32` endpoint pairs, scalars are one `f32` per edge, and colors are `vec4<f32>`. Options control `edgeCount`, grow-only managed GPU record capacity, and retained CPU snapshots. Passing `null` detaches that channel and destroys its managed GPU copy.

Every edge endpoint must be an integer in `[0, nodeCount)`, regardless of source family. Validate producer-owned WebAssembly views and external GPU buffers before supplying them. Update methods copy queued patch bytes and update retained CPU arrays only when present. External buffers must support storage binding and have sufficient capacity.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | `Uint16Array \| Uint32Array \| Float32Array` | Yes | CPU-array payload for edges, edge scalars, or edge colors. |
| `opts` | Object | No | CPU-array setters accept `keepCPUData`; GPU-buffer setters accept `ownBuffer`. |
| `startEdge` | `number` | No | First edge index to patch when using an update method. |
| `buffer` | `GPUBuffer \| null` | Yes | External GPU buffer to use for the matching edge data category. |
| `edgeCount` | `number` | Yes | Required edge count for `NodeLink.setEdgesBuffer`. |

## Returns
`void` - No return value. The call updates edge-side runtime state and may queue later GPU uploads.

## Example
```js
nodeLink.setEdges(new Uint16Array([
    0, 1,
    1, 2
]), { keepCPUData: true });

nodeLink.setEdgeScalars(new Float32Array([0.2, 0.8]));
nodeLink.setEdgeColors(new Float32Array([
    0.2, 0.2, 0.2, 1,
    0.8, 0.8, 0.8, 1
]));

nodeLink.updateEdges(new Uint16Array([2, 0]), 1);
```

## See Also
- [createNodeLink#refreshFromWasm](./createnodelink-refreshfromwasm.md)
- [createNodeLink#clearWasmSources](./createnodelink-clearwasmsources.md)
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#count](./createnodelink-count.md)
- [createNodeLink#colorMode](./createnodelink-colormode.md)
- [createNodeLink#scaleTransform](./createnodelink-scaletransform.md)
- [createNodeLink#setNodeData](./createnodelink-setnodedata.md)
- [createNodeLink#upload](./createnodelink-upload.md)
- [createNodeLink#getRecord](./createnodelink-getrecord.md)
