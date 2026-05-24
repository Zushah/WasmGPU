# NodeLink.ndShape

This page documents the `NodeLink.ndShape` property and the `NodeLink.mapLinearNodeIndexToNd` method.

## Summary
`NodeLink.ndShape` stores the optional multidimensional node layout used to decode node indices into `ndIndex` values. `NodeLink.mapLinearNodeIndexToNd` applies that mapping for node indices only.

Edges do not use `ndShape`. When a pick hit resolves to an edge, the docs-level `ndIndex` stays `null`.

## Syntax
```ts
NodeLink.ndShape: number[] | null
NodeLink.mapLinearNodeIndexToNd(index: number): number[] | null

const shape = nodeLink.ndShape;
const ndIndex = nodeLink.mapLinearNodeIndexToNd(5);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | `number` | Yes | Linear node index to decode through `NodeLink.ndShape`. |

## Returns
`number[] | null` - Decoded multidimensional node index, or `null` when `NodeLink.ndShape` is unset or the index cannot be mapped.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.count](./wasmgpu-objects-nodelink-count.md)
- [NodeLink.decodePickElement](./wasmgpu-objects-nodelink-decodepickelement.md)
- [NodeLink.getRecord](./wasmgpu-objects-nodelink-getrecord.md)
- [WasmGPU.pick](../interact/wasmgpu-pick.md)
