# createMesh#castShadow

## Summary
createMesh#castShadow controls whether this mesh is drawn into enabled directional-light shadow maps. It defaults to `true`; setting it does not enable shadows by itself.

## Syntax
```ts
Mesh.castShadow: boolean
mesh.castShadow = false;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Whether the mesh participates as a shadow caster when `WasmGPU.effects.shadows` enables a directional light.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.box(1, 1, 1);
const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const mesh = wgpu.createMesh(geometry, material);
const value = mesh.castShadow;
console.log(value);
```

## See Also
- [createMesh#addChild](./createmesh-addchild.md)
- [createMesh#clone](./createmesh-clone.md)
- [createMesh#cloneWithMaterial](./createmesh-clonewithmaterial.md)
- [createMesh#destroy](./createmesh-destroy.md)
- [createMesh#getBounds](./createmesh-getbounds.md)
- [createMesh#getLocalBounds](./createmesh-getlocalbounds.md)
- [createMesh#getWorldBounds](./createmesh-getworldbounds.md)
- [createMesh#receiveShadow](./createmesh-receiveshadow.md)
- [effects.shadows.enable](../render/effects-shadows-enable.md)
- [createMesh#removeChild](./createmesh-removechild.md)
- [createMesh#setParent](./createmesh-setparent.md)
- [createMesh#visible](./createmesh-visible.md)
- [createMesh#worldMatrix](./createmesh-worldmatrix.md)
