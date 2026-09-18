# createNodeLink#opacity

This page documents the `NodeLink.opacity` property.

## Summary
`createNodeLink#opacity` is the object-level opacity multiplier for the whole nodelink. It is clamped into the `[0, 1]` range and applies to both nodes and edges.

## Syntax
```ts
NodeLink.opacity: number

const value = nodeLink.opacity;
nodeLink.opacity = 0.5;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Current object-level opacity multiplier.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#lit](./createnodelink-lit.md)
- [createNodeLink#size](./createnodelink-size.md)
- [createNodeLink#onVisualChange](./createnodelink-onvisualchange.md)
