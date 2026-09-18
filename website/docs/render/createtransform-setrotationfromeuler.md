# createTransform#setRotationFromEuler

## Summary
createTransform#setRotationFromEuler sets local orientation from Euler angles.
Angles are interpreted in radians and set the equivalent quaternion rotation.
The conversion composes the axis quaternions in `X * Y * Z` multiplication order.
This is useful for UI sliders or human-readable orientation input.
For simulation pipelines, prefer direct quaternion APIs when this fixed composition order is not the intended convention.

## Syntax
```ts
WasmGPU.createTransform().setRotationFromEuler(x: number, y: number, z: number): this
const result = transform.setRotationFromEuler(rx, ry, rz);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `number` | Yes | Euler rotation around X axis in radians. |
| `y` | `number` | Yes | Euler rotation around Y axis in radians. |
| `z` | `number` | Yes | Euler rotation around Z axis in radians. |

## Returns
`this` - Returns the same transform after quaternion conversion.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const t = wgpu.createTransform();
const pitch = -0.2;
const yaw = Math.PI / 4;
const roll = 0.05;

console.log(t.setRotationFromEuler(pitch, yaw, roll).rotation);
```

## See Also
- [createTransform#setRotation](./createtransform-setrotation.md)
- [createTransform#setRotationFromAxisAngle](./createtransform-setrotationfromaxisangle.md)
- [createTransform#rotateX](./createtransform-rotatex.md)
- [createTransform#rotateY](./createtransform-rotatey.md)
- [createTransform#rotation](./createtransform-rotation.md)
