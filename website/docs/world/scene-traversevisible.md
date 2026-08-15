# Scene.traverseVisible

## Summary
Scene.traverseVisible iterates over meshes whose `visible` property is true. It remains mesh-specific; other renderable families have their own visible traversal methods.

## Syntax
```ts
Scene.traverseVisible(callback: (mesh: Mesh) => void): void
scene.traverseVisible(callback);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(mesh: Mesh) => void` | Yes | Function executed once per visible mesh. |

## Returns
`void` - No value is returned.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const a = wgpu.createMesh(wgpu.geometry.box(1, 1, 1), wgpu.material.unlit({ color: [0.9, 0.3, 0.2] }));
const b = wgpu.createMesh(wgpu.geometry.box(1, 1, 1), wgpu.material.unlit({ color: [0.2, 0.8, 1.0] }));
b.visible = false;
scene.add(a).add(b);
scene.traverseVisible((mesh) => mesh.transform.translate(0.02, 0, 0));
```

## See Also
- [Scene.traverse](./scene-traverse.md)
- [Scene.visibleMeshes](./scene-visiblemeshes.md)
- [Scene.getBounds](./scene-getbounds.md)
- [Scene splat-field traversal](./scene-splatfields.md)
- [Scene lattice-space traversal](./scene-latticespaces.md)
