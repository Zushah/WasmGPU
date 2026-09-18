# createMesh#removeChild

## Summary
createMesh#removeChild detaches the child's transform only when this mesh is its current parent. The child's local transform is preserved and becomes its world transform; unrelated children are a no-op. Scene membership and resource ownership are unchanged.

## Syntax
```ts
Mesh.removeChild(child: Mesh): this
const result = mesh.removeChild(child);
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
mesh.addChild(child);
const result = mesh.removeChild(child);
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
- [createMesh#setParent](./createmesh-setparent.md)
- [createMesh#visible](./createmesh-visible.md)
- [createMesh#worldMatrix](./createmesh-worldmatrix.md)
