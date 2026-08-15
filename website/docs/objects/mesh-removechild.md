# Mesh.removeChild

## Summary
Mesh.removeChild operates on a Mesh runtime object to update state, query data, or manage lifecycle.

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
const child = {};
const result = mesh.removeChild(child);
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
- [Mesh.setParent](./mesh-setparent.md)
- [Mesh.visible](./mesh-visible.md)
- [Mesh.worldMatrix](./mesh-worldmatrix.md)
