# NodeLink.setNodeData

This page documents these node-data APIs:

- `NodeLink.setNodePositions`
- `NodeLink.updateNodePositions`
- `NodeLink.setNodePositionsBuffer`
- `NodeLink.setNodeScalars`
- `NodeLink.updateNodeScalars`
- `NodeLink.setNodeScalarsBuffer`
- `NodeLink.setNodeColors`
- `NodeLink.updateNodeColors`
- `NodeLink.setNodeColorsBuffer`
- `NodeLink.setNodeRadii`
- `NodeLink.updateNodeRadii`
- `NodeLink.setNodeRadiiBuffer`
- `NodeLink.setWasmNodePositions`
- `NodeLink.refreshWasmNodePositions`
- `NodeLink.setWasmNodeScalars`
- `NodeLink.refreshWasmNodeScalars`
- `NodeLink.setWasmNodeColors`
- `NodeLink.refreshWasmNodeColors`
- `NodeLink.setWasmNodeRadii`
- `NodeLink.refreshWasmNodeRadii`

## Summary
These methods update node-side data on a nodelink. Positions, scalars, colors, and radii can come from CPU arrays or from external GPU buffers.

- Positions and radii accept stride `3` or `4` on the CPU-array path.
- Colors are RGBA float data with four components per node.
- Scalar data length must match `NodeLink.nodeCount`.
- GPU-buffer setters replace CPU-backed data for that category.
- GPU buffers are borrowed by default. Pass `{ ownBuffer: true }` to a GPU-buffer setter to transfer destruction responsibility for that replacement.
- Update methods patch subranges and validate bounds before writing.

## Syntax
```ts
NodeLink.setNodePositions(data: Float32Array, opts?: { stride?: 3 | 4; keepCPUData?: boolean }): void
NodeLink.updateNodePositions(data: Float32Array, startNode?: number, stride?: 3 | 4): void
NodeLink.setNodePositionsBuffer(buffer: GPUBuffer, nodeCount: number, opts?: { ownBuffer?: boolean }): void

NodeLink.setNodeScalars(data: Float32Array, opts?: { keepCPUData?: boolean }): void
NodeLink.updateNodeScalars(data: Float32Array, startNode?: number): void
NodeLink.setNodeScalarsBuffer(buffer: GPUBuffer | null, opts?: { ownBuffer?: boolean }): void

NodeLink.setNodeColors(data: Float32Array, opts?: { keepCPUData?: boolean }): void
NodeLink.updateNodeColors(data: Float32Array, startNode?: number): void
NodeLink.setNodeColorsBuffer(buffer: GPUBuffer | null, opts?: { ownBuffer?: boolean }): void

NodeLink.setNodeRadii(data: Float32Array, opts?: { stride?: 3 | 4; keepCPUData?: boolean }): void
NodeLink.updateNodeRadii(data: Float32Array, startNode?: number, stride?: 3 | 4): void
NodeLink.setNodeRadiiBuffer(buffer: GPUBuffer | null, opts?: { ownBuffer?: boolean }): void

NodeLink.setWasmNodePositions(source: WasmMemoryView<Float32Array> | null, options?: NodeLinkWasmNodeChannelOptions): void
NodeLink.refreshWasmNodePositions(options?: NodeLinkWasmNodeRefreshOptions): void
NodeLink.setWasmNodeScalars(source: WasmMemoryView<Float32Array> | null, options?: NodeLinkWasmNodeChannelOptions): void
NodeLink.refreshWasmNodeScalars(options?: NodeLinkWasmNodeRefreshOptions): void
NodeLink.setWasmNodeColors(source: WasmMemoryView<Float32Array> | null, options?: NodeLinkWasmNodeChannelOptions): void
NodeLink.refreshWasmNodeColors(options?: NodeLinkWasmNodeRefreshOptions): void
NodeLink.setWasmNodeRadii(source: WasmMemoryView<Float32Array> | null, options?: NodeLinkWasmNodeChannelOptions): void
NodeLink.refreshWasmNodeRadii(options?: NodeLinkWasmNodeRefreshOptions): void
```

WebAssembly channel setters borrow memory and refresh immediately. Their matching refresh methods re-read the source after producer writes or memory growth. Options control `nodeCount`, grow-only managed GPU capacity, CPU retention, bounds recomputation, and position/radius stride.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | `Float32Array` | Yes | CPU-array payload for node positions, node scalars, node colors, or node radii. |
| `opts` | Object | No | CPU-array setters accept stride/`keepCPUData`; GPU-buffer setters accept `ownBuffer`. |
| `startNode` | `number` | No | First node index to patch when using an update method. |
| `stride` | `3 \| 4` | No | CPU tuple width for position or radii data. |
| `buffer` | `GPUBuffer \| null` | Yes | External GPU buffer to use for the matching node data category. |
| `nodeCount` | `number` | Yes | Required node count for `NodeLink.setNodePositionsBuffer`. |

## Returns
`void` - No return value. The call updates node-side runtime state and may queue later GPU uploads.

## Example
```js
nodeLink.setNodePositions(new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0
]), { stride: 3, keepCPUData: true });

nodeLink.setNodeScalars(new Float32Array([0.1, 0.5, 0.9]));
nodeLink.setNodeColors(new Float32Array([
    1, 0, 0, 1,
    0, 1, 0, 1,
    0, 0, 1, 1
]));

nodeLink.updateNodePositions(new Float32Array([1.2, 0.1, 0.0]), 1, 3);
```

## See Also
- [NodeLink.refreshFromWasm](./wasmgpu-objects-nodelink-refreshfromwasm.md)
- [NodeLink.clearWasmSources](./wasmgpu-objects-nodelink-clearwasmsources.md)
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.count](./wasmgpu-objects-nodelink-count.md)
- [NodeLink.colorMode](./wasmgpu-objects-nodelink-colormode.md)
- [NodeLink.scaleTransform](./wasmgpu-objects-nodelink-scaletransform.md)
- [NodeLink.setEdgeData](./wasmgpu-objects-nodelink-setedgedata.md)
- [NodeLink.upload](./wasmgpu-objects-nodelink-upload.md)
- [NodeLink.getRecord](./wasmgpu-objects-nodelink-getrecord.md)
