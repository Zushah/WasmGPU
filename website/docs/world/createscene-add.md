# createScene#add

## Summary
createScene#add inserts a live `Mesh`, `PointCloud`, `GlyphField`, `NodeLink`, `SplatField`, or `LatticeSpace`. Duplicate insertion of the same instance is ignored. Do not add objects after destroying them. The method returns the same scene to support fluent setup code.

## Syntax
```ts
Scene.add(mesh: Mesh): Scene
Scene.add(pointCloud: PointCloud): Scene
Scene.add(glyphField: GlyphField): Scene
Scene.add(nodeLink: NodeLink): Scene
Scene.add(splatField: SplatField): Scene
Scene.add(latticeSpace: LatticeSpace): Scene
const result = scene.add(object);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mesh` | `Mesh` | Conditional | Triangle mesh object for surface rendering. |
| `pointCloud` | `PointCloud` | Conditional | Point cloud object for particle or sampled-data rendering. |
| `glyphField` | `GlyphField` | Conditional | Glyph field object for vector/tensor style visualization. |
| `nodeLink` | `NodeLink` | Conditional | Graph-style node/edge object for networks, molecular connectivity, and related structures. |
| `splatField` | `SplatField` | Conditional | Gaussian splat object. |
| `latticeSpace` | `LatticeSpace` | Conditional | Regular 2D or 3D cell lattice. |

## Returns
`Scene` - The same scene instance after insertion.

## Type Details
```ts
type SceneObject =
    | Mesh
    | PointCloud
    | GlyphField
    | NodeLink
    | SplatField
    | LatticeSpace;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const mesh = wgpu.createMesh(
    wgpu.geometry.sphere(0.6, 24, 16),
    wgpu.material.unlit({ color: [0.2, 0.7, 0.95], opacity: 1.0 })
);
const graph = wgpu.createNodeLink({
    nodePositions: new Float32Array([
        -0.5, 0.0, 0.0,
         0.5, 0.0, 0.0
    ]),
    edges: new Uint16Array([0, 1])
});

scene.add(mesh).add(graph);
```

## See Also
- [createScene#remove](./createscene-remove.md)
- [createScene#clear](./createscene-clear.md)
- [createScene#meshes](./createscene-meshes.md)
- [createScene#pointClouds](./createscene-pointclouds.md)
- [createScene#glyphFields](./createscene-glyphfields.md)
- [createScene#nodeLinks](./createscene-nodelinks.md)
- [Scene splat-field APIs](./createscene-splatfields.md)
- [Scene lattice-space APIs](./createscene-latticespaces.md)
