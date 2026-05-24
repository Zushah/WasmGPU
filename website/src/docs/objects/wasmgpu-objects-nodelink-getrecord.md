# NodeLink.getRecord

This page documents the paired `NodeLink.getNodeRecord` and `NodeLink.getEdgeRecord` methods.

## Summary
These methods return the retained CPU-side records for a node or an edge.

- `NodeLink.getNodeRecord` requires retained CPU node positions.
- `NodeLink.getEdgeRecord` requires retained CPU edge data.
- Edge endpoint positions require retained CPU node positions.
- Scalar and color fields can be `null` when those optional CPU-side arrays are unavailable.

## Syntax
```ts
NodeLink.getNodeRecord(index: number): {
    position: [number, number, number];
    scalar: number | null;
    color: [number, number, number, number] | null;
} | null

NodeLink.getEdgeRecord(index: number): {
    src: number;
    dst: number;
    scalar: number | null;
    color: [number, number, number, number] | null;
    srcPosition: [number, number, number] | null;
    dstPosition: [number, number, number] | null;
} | null
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | `number` | Yes | Node index for `NodeLink.getNodeRecord` or edge index for `NodeLink.getEdgeRecord`. |

## Returns
Node or edge record data when the required retained CPU data exists; otherwise `null`.

## Example
```js
const nodeRecord = nodeLink.getNodeRecord(2);
const edgeRecord = nodeLink.getEdgeRecord(1);

console.log(nodeRecord?.position, edgeRecord?.src, edgeRecord?.dst);
```

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.setNodeData](./wasmgpu-objects-nodelink-setnodedata.md)
- [NodeLink.setEdgeData](./wasmgpu-objects-nodelink-setedgedata.md)
- [NodeLink.dropCPUData](./wasmgpu-objects-nodelink-dropcpudata.md)
- [WasmGPU.pick](../interact/wasmgpu-pick.md)
