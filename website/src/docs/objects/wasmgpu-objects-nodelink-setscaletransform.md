# NodeLink.setScaleTransform

This page documents the paired `NodeLink.setNodeScaleTransform` and `NodeLink.setEdgeScaleTransform` methods.

## Summary
These methods replace the node-side or edge-side scale transform independently. Updating either transform marks uniform state dirty, bumps the matching scale revision, and emits a `scale` visual-change event.

## Syntax
```ts
NodeLink.setNodeScaleTransform(t: ScaleTransformDescriptor | ScaleTransform): void
NodeLink.setEdgeScaleTransform(t: ScaleTransformDescriptor | ScaleTransform): void

nodeLink.setNodeScaleTransform({ mode: "linear", domainMin: 0, domainMax: 1 });
nodeLink.setEdgeScaleTransform({ mode: "log", domainMin: 0.01, domainMax: 10 });
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `t` | `ScaleTransformDescriptor \| ScaleTransform` | Yes | Replacement scale transform for the node or edge scalar path. |

## Returns
`void` - No return value. The call updates runtime scale state on the nodelink.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.scaleTransform](./wasmgpu-objects-nodelink-scaletransform.md)
- [NodeLink.applyScaleStats](./wasmgpu-objects-nodelink-applyscalestats.md)
- [NodeLink.getScaleSourceDescriptor](./wasmgpu-objects-nodelink-getscalesourcedescriptor.md)
- [NodeLink.onVisualChange](./wasmgpu-objects-nodelink-onvisualchange.md)
