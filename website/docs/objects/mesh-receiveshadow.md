# Mesh.receiveShadow

## Summary
Mesh.receiveShadow controls whether this mesh's supported standard-material render path samples enabled directional shadow maps. It defaults to `true`; setting it does not enable shadows by itself.

## Syntax
```ts
Mesh.receiveShadow: boolean
mesh.receiveShadow = false;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Whether the mesh receives supported directional shadows.

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
const value = mesh.receiveShadow;
console.log(value);
```

## See Also
- [Mesh.addChild](./mesh-addchild.md)
- [Mesh.castShadow](./mesh-castshadow.md)
- [ShadowSystem.enable](../render/shadowsystem-enable.md)
- [Mesh.clone](./mesh-clone.md)
- [Mesh.cloneWithMaterial](./mesh-clonewithmaterial.md)
- [Mesh.destroy](./mesh-destroy.md)
- [Mesh.getBounds](./mesh-getbounds.md)
- [Mesh.getLocalBounds](./mesh-getlocalbounds.md)
- [Mesh.getWorldBounds](./mesh-getworldbounds.md)
- [Mesh.removeChild](./mesh-removechild.md)
- [Mesh.setParent](./mesh-setparent.md)
- [Mesh.visible](./mesh-visible.md)
- [Mesh.worldMatrix](./mesh-worldmatrix.md)
