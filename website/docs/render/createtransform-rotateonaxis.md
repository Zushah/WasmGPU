# createTransform#rotateOnAxis

## Summary
createTransform#rotateOnAxis applies an incremental local rotation around an arbitrary axis.
It multiplies the current quaternion by an axis-angle quaternion and normalizes the result.
The increment is post-multiplied (`current * delta`), so the axis is interpreted in the transform's local frame.
Use this for continuous spinning or controller-driven angular updates.
The method normalizes the axis; `angle` is in radians.

## Syntax
```ts
WasmGPU.createTransform().rotateOnAxis(axis: number[], angle: number): this
const result = transform.rotateOnAxis(axis, angle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `axis` | `number[]` | Yes | Rotation axis as three components; the method normalizes it. |
| `angle` | `number` | Yes | Incremental rotation amount in radians. |

## Returns
`this` - Returns the same transform after composing the rotation.

## Type Details
```ts
type Axis3 = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const rotor = wgpu.createTransform();
const axis = [0, 1, 0];
for (let i = 0; i < 3; i++) {
    rotor.rotateOnAxis(axis, Math.PI / 12);
}
console.log(rotor.rotation);
```

## See Also
- [createTransform#setRotationFromAxisAngle](./createtransform-setrotationfromaxisangle.md)
- [createTransform#rotateX](./createtransform-rotatex.md)
- [createTransform#rotateY](./createtransform-rotatey.md)
- [createTransform#rotateZ](./createtransform-rotatez.md)
- [createTransform#rotation](./createtransform-rotation.md)
