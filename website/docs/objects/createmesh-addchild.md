# createMesh#addChild

## Summary
createMesh#addChild reparents the child's transform under this mesh's transform. It rejects self-parenting or cycles through the transform API, preserves the child's local transform rather than its current world transform, and does not add the child to a scene.

## Syntax
```ts
Mesh.addChild(child: Mesh): this
const result = mesh.addChild(child);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `child` | `Mesh` | Yes | Child mesh/transform reference used for hierarchy operations. |

## Returns
`this` - The same object instance, returned for fluent chaining.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.box(1, 1, 1);
const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const mesh = wgpu.createMesh(geometry, material);
const child = wgpu.createMesh(
    wgpu.geometry.box(0.25, 0.25, 0.25),
    wgpu.material.unlit({ color: [0.2, 0.8, 0.4] })
);
const result = mesh.addChild(child);
console.log(result);
```

## See Also
- [createMesh#castShadow](./createmesh-castshadow.md)
- [createMesh#clone](./createmesh-clone.md)
- [createMesh#cloneWithMaterial](./createmesh-clonewithmaterial.md)
- [createMesh#destroy](./createmesh-destroy.md)
- [createMesh#getBounds](./createmesh-getbounds.md)
- [createMesh#getLocalBounds](./createmesh-getlocalbounds.md)
- [createMesh#getWorldBounds](./createmesh-getworldbounds.md)
- [createMesh#receiveShadow](./createmesh-receiveshadow.md)
- [createMesh#removeChild](./createmesh-removechild.md)
- [createMesh#setParent](./createmesh-setparent.md)
- [createMesh#visible](./createmesh-visible.md)
- [createMesh#worldMatrix](./createmesh-worldmatrix.md)
