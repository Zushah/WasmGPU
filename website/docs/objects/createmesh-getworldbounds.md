# createMesh#getWorldBounds

## Summary
createMesh#getWorldBounds transforms the current local bounds by the mesh world matrix and returns a new world-space axis-aligned box and conservative sphere. Morph weights are reflected when a morph runtime exists; skin deformation is not incorporated.

## Syntax
```ts
Mesh.getWorldBounds(): Bounds3
const result = mesh.getWorldBounds();
```

## Parameters
This API does not take parameters.

## Returns
`Bounds3` - Bounds structure containing axis-aligned box and bounding-sphere data.

## Type Details
### Bounds3

```ts
type Bounds3 = {

    boxMin: Vec3;

    boxMax: Vec3;

    sphereCenter: Vec3;

    sphereRadius: number;

    empty: boolean;

    partial: boolean;

};
```

#### Bounds3 Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `boxMin` | `Vec3` | Yes | Minimum corner of the axis-aligned bounding box. |
| `boxMax` | `Vec3` | Yes | Maximum corner of the axis-aligned bounding box. |
| `sphereCenter` | `Vec3` | Yes | Center of the associated bounding sphere. |
| `sphereRadius` | `number` | Yes | Radius of the associated bounding sphere. |
| `empty` | `boolean` | Yes | Whether the bounds contain no geometry. |
| `partial` | `boolean` | Yes | Whether the result omits geometry whose bounds could not be determined. |

### Vec3

```ts
type Vec3 = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.box(1, 1, 1);
const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const mesh = wgpu.createMesh(geometry, material);
const result = mesh.getWorldBounds();
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
- [createMesh#receiveShadow](./createmesh-receiveshadow.md)
- [createMesh#removeChild](./createmesh-removechild.md)
- [createMesh#setParent](./createmesh-setparent.md)
- [createMesh#visible](./createmesh-visible.md)
- [createMesh#worldMatrix](./createmesh-worldmatrix.md)
