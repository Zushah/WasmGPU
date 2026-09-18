# createTransform#rotateX

## Summary
createTransform#rotateX applies an incremental local rotation around the X axis.
It composes the new rotation with the current quaternion and normalizes the result.
Use this for pitch-like adjustments in camera rigs, articulated joints, or scripted motion.
Angles are expressed in radians.

## Syntax
```ts
WasmGPU.createTransform().rotateX(angle: number): this
const result = transform.rotateX(angle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `angle` | `number` | Yes | Incremental rotation around X axis in radians. |

## Returns
`this` - Returns the same transform after rotation.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const head = wgpu.createTransform();
head.rotateX(-0.1).rotateX(-0.1);
console.log(head.rotation);
```

## See Also
- [createTransform#rotateY](./createtransform-rotatey.md)
- [createTransform#rotateZ](./createtransform-rotatez.md)
- [createTransform#rotateOnAxis](./createtransform-rotateonaxis.md)
- [createTransform#setRotationFromEuler](./createtransform-setrotationfromeuler.md)
- [createTransform#rotation](./createtransform-rotation.md)
