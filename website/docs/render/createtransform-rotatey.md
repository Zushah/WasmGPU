# createTransform#rotateY

## Summary
createTransform#rotateY applies an incremental local rotation around the Y axis.
This is a common operation for yaw behavior and orbital motion.
The method composes and normalizes quaternion state for numerical stability.
Angles are in radians.

## Syntax
```ts
WasmGPU.createTransform().rotateY(angle: number): this
const result = transform.rotateY(angle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `angle` | `number` | Yes | Incremental rotation around Y axis in radians. |

## Returns
`this` - Returns the same transform after rotation.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const satellite = wgpu.createTransform();
for (let i = 0; i < 4; i++) {
    satellite.rotateY(Math.PI / 16);
}
console.log(satellite.rotation);
```

## See Also
- [createTransform#rotateX](./createtransform-rotatex.md)
- [createTransform#rotateZ](./createtransform-rotatez.md)
- [createTransform#rotateOnAxis](./createtransform-rotateonaxis.md)
- [createTransform#setRotation](./createtransform-setrotation.md)
- [createTransform#rotation](./createtransform-rotation.md)
