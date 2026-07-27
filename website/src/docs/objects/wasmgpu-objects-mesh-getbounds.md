# Mesh.getBounds

## Summary
Mesh.getBounds returns the current bounds value derived from this Mesh runtime state.

## Syntax
```ts
Mesh.getBounds(): Bounds3
const result = mesh.getBounds();
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
| `sphereRadius` | `number` | Yes | Numeric input controlling `sphereRadius` for this operation. |
| `empty` | `boolean` | Yes | Boolean flag that toggles `empty` behavior. |
| `partial` | `boolean` | Yes | Boolean flag that toggles `partial` behavior. |

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
const result = mesh.getBounds();
console.log(result);
```

## See Also
- [Mesh.addChild](./wasmgpu-objects-mesh-addchild.md)
- [Mesh.castShadow](./wasmgpu-objects-mesh-castshadow.md)
- [Mesh.clone](./wasmgpu-objects-mesh-clone.md)
- [Mesh.cloneWithMaterial](./wasmgpu-objects-mesh-clonewithmaterial.md)
- [Mesh.destroy](./wasmgpu-objects-mesh-destroy.md)
- [Mesh.getLocalBounds](./wasmgpu-objects-mesh-getlocalbounds.md)
- [Mesh.getWorldBounds](./wasmgpu-objects-mesh-getworldbounds.md)
- [Mesh.receiveShadow](./wasmgpu-objects-mesh-receiveshadow.md)
- [Mesh.removeChild](./wasmgpu-objects-mesh-removechild.md)
- [Mesh.setParent](./wasmgpu-objects-mesh-setparent.md)
- [Mesh.visible](./wasmgpu-objects-mesh-visible.md)
- [Mesh.worldMatrix](./wasmgpu-objects-mesh-worldmatrix.md)
