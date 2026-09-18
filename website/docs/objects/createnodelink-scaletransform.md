# createNodeLink#scaleTransform

This page documents the paired `NodeLink.nodeScaleTransform` and `NodeLink.edgeScaleTransform` properties.

## Summary
Node and edge scale transforms are independent on a nodelink. They read different scalar sources and can use different domains, clamping, value extraction, and nonlinear mapping.

Use `NodeLink.nodeScaleTransform` for node scalar-driven visuals and `NodeLink.edgeScaleTransform` for edge scalar-driven visuals.

## Syntax
```ts
NodeLink.nodeScaleTransform: ScaleTransform
NodeLink.edgeScaleTransform: ScaleTransform

const nodeScale = nodeLink.nodeScaleTransform;
const edgeScale = nodeLink.edgeScaleTransform;
```

## Parameters
This API does not take parameters.

## Returns
`ScaleTransform` - Cloned node or edge scale-transform state currently active on this nodelink.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [createNodeLink#setScaleTransform](./createnodelink-setscaletransform.md)
- [createNodeLink#applyScaleStats](./createnodelink-applyscalestats.md)
- [createNodeLink#getScaleSourceDescriptor](./createnodelink-getscalesourcedescriptor.md)
- [createNodeLink#colorMode](./createnodelink-colormode.md)
