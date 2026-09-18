# createMesh#destroy

## Summary
createMesh#destroy is idempotent. It detaches the mesh from every tracked scene, releases morph GPU buffers and its skin instance, disposes its transform (detaching parent and children), and releases one geometry and material reference. Shared geometry/material resources survive while other retained references remain; referenced textures follow their separate lifetime.

## Syntax
```ts
Mesh.destroy(): void
mesh.destroy();
```

## Parameters
None.

## Returns
`void`

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.box(1, 1, 1);
const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const mesh = wgpu.createMesh(geometry, material);
mesh.destroy();
```

## See Also
- [createMesh#addChild](./createmesh-addchild.md)
- [createMesh#castShadow](./createmesh-castshadow.md)
- [createMesh#clone](./createmesh-clone.md)
- [createMesh#cloneWithMaterial](./createmesh-clonewithmaterial.md)
- [createMesh#getBounds](./createmesh-getbounds.md)
- [createMesh#getLocalBounds](./createmesh-getlocalbounds.md)
- [createMesh#getWorldBounds](./createmesh-getworldbounds.md)
- [createMesh#receiveShadow](./createmesh-receiveshadow.md)
- [createMesh#removeChild](./createmesh-removechild.md)
- [createMesh#setParent](./createmesh-setparent.md)
- [createMesh#visible](./createmesh-visible.md)
- [createMesh#worldMatrix](./createmesh-worldmatrix.md)
