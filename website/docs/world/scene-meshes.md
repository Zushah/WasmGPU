# Scene.meshes

## Summary
Scene.meshes returns all mesh objects currently attached to the scene. This is the raw collection and includes meshes regardless of their `visible` state. Use it for object management and inspection tooling.

## Syntax
```ts
Scene.meshes: readonly Mesh[]
const meshes = scene.meshes;
```

## Parameters
This property does not take parameters.

## Returns
`readonly Mesh[]` - Scene mesh collection in insertion order.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.add(wgpu.createMesh(wgpu.geometry.box(1, 1, 1), wgpu.material.unlit({ color: [0.9, 0.5, 0.2] })));
console.log(scene.meshes.length);
```

## See Also
- [Scene.visibleMeshes](./scene-visiblemeshes.md)
- [Scene.add](./scene-add.md)
- [Scene.remove](./scene-remove.md)
- [Scene.traverse](./scene-traverse.md)
