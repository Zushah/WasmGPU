# Mesh.setParent

## Summary
Mesh.setParent updates parent state on this Mesh and marks dependent GPU data for refresh.

## Syntax
```ts
Mesh.setParent(parent: Mesh | null): this
const result = mesh.setParent(parent);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `parent` | `Mesh \| null` | Yes | Parent mesh/transform reference; use null to detach. |

## Returns
`this` - The same object instance, returned for fluent chaining.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.box(1, 1, 1);
const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const mesh = wgpu.createMesh(geometry, material);
const parent = null;
const result = mesh.setParent(parent);
console.log(result);
```

## See Also
- [Mesh.addChild](./mesh-addchild.md)
- [Mesh.castShadow](./mesh-castshadow.md)
- [Mesh.clone](./mesh-clone.md)
- [Mesh.cloneWithMaterial](./mesh-clonewithmaterial.md)
- [Mesh.destroy](./mesh-destroy.md)
- [Mesh.getBounds](./mesh-getbounds.md)
- [Mesh.getLocalBounds](./mesh-getlocalbounds.md)
- [Mesh.getWorldBounds](./mesh-getworldbounds.md)
- [Mesh.receiveShadow](./mesh-receiveshadow.md)
- [Mesh.removeChild](./mesh-removechild.md)
- [Mesh.visible](./mesh-visible.md)
- [Mesh.worldMatrix](./mesh-worldmatrix.md)
