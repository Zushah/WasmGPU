# createMesh#setParent

## Summary
createMesh#setParent reparents this mesh's transform to another mesh or detaches it with `null`. It rejects self-parenting and cycles, preserves local—not world—transform values, and does not change either mesh's scene membership.

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
- [createMesh#addChild](./createmesh-addchild.md)
- [createMesh#castShadow](./createmesh-castshadow.md)
- [createMesh#clone](./createmesh-clone.md)
- [createMesh#cloneWithMaterial](./createmesh-clonewithmaterial.md)
- [createMesh#destroy](./createmesh-destroy.md)
- [createMesh#getBounds](./createmesh-getbounds.md)
- [createMesh#getLocalBounds](./createmesh-getlocalbounds.md)
- [createMesh#getWorldBounds](./createmesh-getworldbounds.md)
- [createMesh#receiveShadow](./createmesh-receiveshadow.md)
- [createMesh#removeChild](./createmesh-removechild.md)
- [createMesh#visible](./createmesh-visible.md)
- [createMesh#worldMatrix](./createmesh-worldmatrix.md)
