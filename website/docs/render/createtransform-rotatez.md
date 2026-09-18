# createTransform#rotateZ

## Summary
createTransform#rotateZ applies an incremental local rotation around the Z axis.
This is often used for roll behavior and 2D-plane orientation updates.
The result is composed with the current rotation and normalized.
Angles are in radians.

## Syntax
```ts
WasmGPU.createTransform().rotateZ(angle: number): this
const result = transform.rotateZ(angle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `angle` | `number` | Yes | Incremental rotation around Z axis in radians. |

## Returns
`this` - Returns the same transform after rotation.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const spriteAnchor = wgpu.createTransform();
spriteAnchor.rotateZ(Math.PI / 6).rotateZ(-Math.PI / 18);
console.log(spriteAnchor.rotation);
```

## See Also
- [createTransform#rotateX](./createtransform-rotatex.md)
- [createTransform#rotateY](./createtransform-rotatey.md)
- [createTransform#rotateOnAxis](./createtransform-rotateonaxis.md)
- [createTransform#setRotationFromEuler](./createtransform-setrotationfromeuler.md)
- [createTransform#rotation](./createtransform-rotation.md)
