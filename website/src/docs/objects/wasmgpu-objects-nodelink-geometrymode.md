# NodeLink.geometryMode

This page documents the paired `NodeLink.nodeGeometryMode` and `NodeLink.edgeGeometryMode` properties.

## Summary
Nodes and edges choose geometry independently on a nodelink. Use point and line modes when you want the lightest-weight graph view, and use the solid geometry modes when you want shaded node or edge volume.

## Syntax
```ts
NodeLink.nodeGeometryMode: "points" | "spheres" | "ellipsoids" | "cubes"
NodeLink.edgeGeometryMode: "lines" | "cylinders"

const nodeMode = nodeLink.nodeGeometryMode;
const edgeMode = nodeLink.edgeGeometryMode;
```

## Parameters
This API does not take parameters.

## Returns
Reading these properties returns the current node and edge geometry modes for this nodelink.

## Type Details
- `NodeLink.nodeGeometryMode`
  - `points`: screen-facing points for large node counts.
  - `spheres`: shaded spheres with one radius per node.
  - `ellipsoids`: shaded ellipsoids using per-node radii data.
  - `cubes`: shaded box-like node instances.
- `NodeLink.edgeGeometryMode`
  - `lines`: line rendering for lightweight connectivity views.
  - `cylinders`: shaded cylindrical edges.

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.colorMode](./wasmgpu-objects-nodelink-colormode.md)
- [NodeLink.size](./wasmgpu-objects-nodelink-size.md)
- [NodeLink.minPointSize](./wasmgpu-objects-nodelink-minpointsize.md)
- [NodeLink.pointSizeAttenuation](./wasmgpu-objects-nodelink-pointsizeattenuation.md)
