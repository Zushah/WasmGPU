# NodeLink.setEdgeData

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

## Summary
These methods update edge-side data on a nodelink.

- `NodeLink.setEdges` and `NodeLink.updateEdges` use source/destination node-index pairs.
- CPU-backed edges can be `Uint16Array` or `Uint32Array`.
- Edge scalar length must match `NodeLink.edgeCount`.
- Edge colors are RGBA float data with four components per edge.
- GPU-buffer setters replace CPU-backed data for that category.
- Update methods patch subranges and validate bounds before writing.

## Syntax
```ts
NodeLink.setEdges(data: Uint16Array | Uint32Array, opts?: { keepCPUData?: boolean }): void
NodeLink.updateEdges(data: Uint16Array | Uint32Array, startEdge?: number): void
NodeLink.setEdgesBuffer(buffer: GPUBuffer, edgeCount: number): void

NodeLink.setEdgeScalars(data: Float32Array, opts?: { keepCPUData?: boolean }): void
NodeLink.updateEdgeScalars(data: Float32Array, startEdge?: number): void
NodeLink.setEdgeScalarsBuffer(buffer: GPUBuffer | null): void

NodeLink.setEdgeColors(data: Float32Array, opts?: { keepCPUData?: boolean }): void
NodeLink.updateEdgeColors(data: Float32Array, startEdge?: number): void
NodeLink.setEdgeColorsBuffer(buffer: GPUBuffer | null): void
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | `Uint16Array \| Uint32Array \| Float32Array` | Yes | CPU-array payload for edges, edge scalars, or edge colors. |
| `opts` | Object | No | Optional `keepCPUData` control for CPU-array uploads. |
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
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.count](./wasmgpu-objects-nodelink-count.md)
- [NodeLink.colorMode](./wasmgpu-objects-nodelink-colormode.md)
- [NodeLink.scaleTransform](./wasmgpu-objects-nodelink-scaletransform.md)
- [NodeLink.setNodeData](./wasmgpu-objects-nodelink-setnodedata.md)
- [NodeLink.upload](./wasmgpu-objects-nodelink-upload.md)
- [NodeLink.getRecord](./wasmgpu-objects-nodelink-getrecord.md)
