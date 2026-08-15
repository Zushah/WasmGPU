# NodeLink.decodePickElement

This page documents the `NodeLink.decodePickElement` method.

## Summary
`NodeLink.decodePickElement` maps a renderer element index back to either a node or an edge. Element indices map to nodes first, then to edges.

That means `0 .. NodeLink.nodeCount - 1` resolve to nodes, and the next `NodeLink.edgeCount` element indices resolve to edges.

## Syntax
```ts
NodeLink.decodePickElement(elementIndex: number): { component: "node" | "edge"; componentIndex: number } | null

const decoded = nodeLink.decodePickElement(elementIndex);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `elementIndex` | `number` | Yes | Renderer element index to decode back into node or edge space. |

## Returns
`{ component: "node" | "edge"; componentIndex: number } | null` - Decoded component kind and component index, or `null` when the element index is out of range.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.count](./nodelink-count.md)
- [NodeLink.ndShape](./nodelink-ndshape.md)
- [NodeLink.getRecord](./nodelink-getrecord.md)
- [WasmGPU.pick](../interact/wasmgpu-pick.md)
