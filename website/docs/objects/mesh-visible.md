# Mesh.visible

## Summary
Mesh.visible reads the current `visible` value from this Mesh instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Mesh.visible: boolean
const value = mesh.visible;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Boolean result indicating whether the queried condition is satisfied.

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
const value = mesh.visible;
console.log(value);
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
- [Mesh.setParent](./mesh-setparent.md)
- [Mesh.worldMatrix](./mesh-worldmatrix.md)
