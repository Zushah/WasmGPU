# createTransform#setPosition

## Summary
createTransform#setPosition sets local translation in parent space.
The call writes directly to the transform store and marks this node dirty for matrix recomputation.
Use this for absolute placement, then use `translate` for relative offsets.
All values are raw numeric units defined by your world scale conventions.

## Syntax
```ts
WasmGPU.createTransform().setPosition(x: number, y: number, z: number): this
const result = transform.setPosition(x, y, z);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `number` | Yes | Local X coordinate in parent space. |
| `y` | `number` | Yes | Local Y coordinate in parent space. |
| `z` | `number` | Yes | Local Z coordinate in parent space. |

## Returns
`this` - Returns the same transform for fluent chaining.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const cameraRig = wgpu.createTransform();
cameraRig
    .setPosition(0, 2.0, 6.0)
    .setRotationFromEuler(-0.2, 0.0, 0.0);

console.log(cameraRig.position);
```

## See Also
- [createTransform#position](./createtransform-position.md)
- [createTransform#translate](./createtransform-translate.md)
- [createTransform#setParent](./createtransform-setparent.md)
- [createTransform#localMatrix](./createtransform-localmatrix.md)
- [createTransform#worldPosition](./createtransform-worldposition.md)
