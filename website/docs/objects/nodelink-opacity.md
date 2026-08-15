# NodeLink.opacity

This page documents the `NodeLink.opacity` property.

## Summary
`NodeLink.opacity` is the object-level opacity multiplier for the whole nodelink. It is clamped into the `[0, 1]` range and applies to both nodes and edges.

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
- [NodeLink.lit](./nodelink-lit.md)
- [NodeLink.size](./nodelink-size.md)
- [NodeLink.onVisualChange](./nodelink-onvisualchange.md)
