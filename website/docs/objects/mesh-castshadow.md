# Mesh.castShadow

## Summary
Mesh.castShadow controls whether this mesh is drawn into enabled directional-light shadow maps. It defaults to `true`; setting it does not enable shadows by itself.

## Syntax
```ts
Mesh.castShadow: boolean
mesh.castShadow = false;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Whether the mesh participates as a shadow caster when `WasmGPU.effects.shadows` enables a directional light.

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
const value = mesh.castShadow;
console.log(value);
```

## See Also
- [Mesh.addChild](./mesh-addchild.md)
- [Mesh.clone](./mesh-clone.md)
- [Mesh.cloneWithMaterial](./mesh-clonewithmaterial.md)
- [Mesh.destroy](./mesh-destroy.md)
- [Mesh.getBounds](./mesh-getbounds.md)
- [Mesh.getLocalBounds](./mesh-getlocalbounds.md)
- [Mesh.getWorldBounds](./mesh-getworldbounds.md)
- [Mesh.receiveShadow](./mesh-receiveshadow.md)
- [ShadowSystem.enable](../render/shadowsystem-enable.md)
- [Mesh.removeChild](./mesh-removechild.md)
- [Mesh.setParent](./mesh-setparent.md)
- [Mesh.visible](./mesh-visible.md)
- [Mesh.worldMatrix](./mesh-worldmatrix.md)
