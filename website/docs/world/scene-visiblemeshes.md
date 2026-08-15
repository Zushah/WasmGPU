# Scene.visibleMeshes

## Summary
Scene.visibleMeshes returns mesh objects whose `visible` flag is true. This is a filtered convenience view over `scene.meshes` and is useful for UI counts and custom traversal logic.

## Syntax
```ts
Scene.visibleMeshes: Mesh[]
const meshes = scene.visibleMeshes;
```

## Parameters
This property does not take parameters.

## Returns
`Mesh[]` - Visible mesh subset.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const a = wgpu.createMesh(wgpu.geometry.box(1, 1, 1), wgpu.material.unlit({ color: [1, 0.5, 0.3] }));
const b = wgpu.createMesh(wgpu.geometry.box(1, 1, 1), wgpu.material.unlit({ color: [0.3, 0.7, 1] }));
b.visible = false;
scene.add(a).add(b);
console.log(scene.visibleMeshes.length);
```

## See Also
- [Scene.meshes](./scene-meshes.md)
- [Scene.traverseVisible](./scene-traversevisible.md)
- [Scene.getBounds](./scene-getbounds.md)
