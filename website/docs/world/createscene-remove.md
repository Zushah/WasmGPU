# createScene#remove

## Summary
createScene#remove detaches a `Mesh`, `PointCloud`, `GlyphField`, `NodeLink`, `SplatField`, or `LatticeSpace` if present. It does not destroy the object, and removing a missing object is a no-op. The method returns the same scene for chaining.

## Syntax
```ts
Scene.remove(mesh: Mesh): Scene
Scene.remove(pointCloud: PointCloud): Scene
Scene.remove(glyphField: GlyphField): Scene
Scene.remove(nodeLink: NodeLink): Scene
Scene.remove(splatField: SplatField): Scene
Scene.remove(latticeSpace: LatticeSpace): Scene
const result = scene.remove(object);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mesh` | `Mesh` | Conditional | Mesh instance to remove from `scene.meshes`. |
| `pointCloud` | `PointCloud` | Conditional | Point cloud instance to remove from `scene.pointClouds`. |
| `glyphField` | `GlyphField` | Conditional | Glyph field instance to remove from `scene.glyphFields`. |
| `nodeLink` | `NodeLink` | Conditional | NodeLink instance to remove from `scene.nodeLinks`. |
| `splatField` | `SplatField` | Conditional | SplatField instance to detach without destroying it. |
| `latticeSpace` | `LatticeSpace` | Conditional | LatticeSpace instance to detach without destroying it. |

## Returns
`Scene` - The same scene instance after removal attempt.

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
const graph = wgpu.createNodeLink({
    nodePositions: new Float32Array([
        -0.5, 0.0, 0.0,
         0.5, 0.0, 0.0
    ]),
    edges: new Uint16Array([0, 1])
});
scene.add(graph);
scene.remove(graph);
```

## See Also
- [createScene#add](./createscene-add.md)
- [createScene#clear](./createscene-clear.md)
- [createScene#meshes](./createscene-meshes.md)
- [createScene#pointClouds](./createscene-pointclouds.md)
- [createScene#glyphFields](./createscene-glyphfields.md)
- [createScene#nodeLinks](./createscene-nodelinks.md)
