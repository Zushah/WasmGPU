# createScene#traverse

## Summary
createScene#traverse iterates over every mesh in insertion order. It remains the mesh-specific traversal method; use the family-specific traversal methods for point clouds, glyph fields, NodeLink objects, splat fields, or lattice spaces.

## Syntax
```ts
Scene.traverse(callback: (mesh: Mesh) => void): void
scene.traverse(callback);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(mesh: Mesh) => void` | Yes | Function executed once per mesh. |

## Returns
`void` - No value is returned; callback side effects drive behavior.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.add(wgpu.createMesh(wgpu.geometry.box(1, 1, 1), wgpu.material.unlit({ color: [1, 0.5, 0.2] })));
scene.add(wgpu.createMesh(wgpu.geometry.sphere(0.7, 20, 14), wgpu.material.unlit({ color: [0.2, 0.7, 1.0] })));

scene.traverse((mesh) => {
    mesh.transform.translate(0, 0.05, 0);
});
```

## See Also
- [createScene#traverseVisible](./createscene-traversevisible.md)
- [createScene#meshes](./createscene-meshes.md)
- [createScene#findByName](./createscene-findbyname.md)
- [Scene splat-field traversal](./createscene-splatfields.md)
- [Scene lattice-space traversal](./createscene-latticespaces.md)
