# createTransform#setRotationFromAxisAngle

## Summary
createTransform#setRotationFromAxisAngle sets local orientation from an axis-angle pair.
The method normalizes the axis vector and converts the rotation into a quaternion.
Use this when rotation is naturally expressed around a known direction (for example spin around Y axis).
The angle is specified in radians.

## Syntax
```ts
WasmGPU.createTransform().setRotationFromAxisAngle(axis: number[], angle: number): this
const result = transform.setRotationFromAxisAngle(axis, angle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `axis` | `number[]` | Yes | Rotation axis as three numeric components; the method normalizes it. |
| `angle` | `number` | Yes | Rotation angle in radians around `axis`. |

## Returns
`this` - Returns the same transform after setting orientation.

## Type Details
```ts
type Axis3 = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const spinner = wgpu.createTransform();
const axis = [0, 1, 0];
spinner.setRotationFromAxisAngle(axis, Math.PI / 3);

console.log(spinner.rotation);
```

## See Also
- [createTransform#setRotation](./createtransform-setrotation.md)
- [createTransform#setRotationFromEuler](./createtransform-setrotationfromeuler.md)
- [createTransform#rotateOnAxis](./createtransform-rotateonaxis.md)
- [createTransform#rotateY](./createtransform-rotatey.md)
- [createTransform#rotation](./createtransform-rotation.md)
