# Scene.findAllByName

## Summary
Scene.findAllByName returns all meshes whose `name` exactly matches the given string. It is mesh-specific; other renderable families have their own lookup methods. The returned array may be empty.

## Syntax
```ts
Scene.findAllByName(name: string): Mesh[]
const meshes = scene.findAllByName(name);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Exact mesh name to match. |

## Returns
`Mesh[]` - Array of matching meshes (possibly empty).

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
for (let i = 0; i < 3; i++) {
    const m = wgpu.createMesh(wgpu.geometry.box(1, 1, 1), wgpu.material.unlit({ color: [0.8, 0.6, 0.2] }));
    m.name = "cell";
    scene.add(m);
}
console.log(scene.findAllByName("cell").length);
```

## See Also
- [Scene.findByName](./scene-findbyname.md)
- [Scene.traverse](./scene-traverse.md)
- [Scene.meshes](./scene-meshes.md)
- [Scene.splatFields and splat-field lookup](./scene-splatfields.md)
- [Scene.latticeSpaces and lattice-space lookup](./scene-latticespaces.md)
