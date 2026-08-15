# WasmGPU.createTransform().rotateX

## Summary
WasmGPU.createTransform().rotateX applies an incremental local rotation around the X axis.
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
- [WasmGPU.createTransform().rotateY](./wasmgpu-createtransform-rotatey.md)
- [WasmGPU.createTransform().rotateZ](./wasmgpu-createtransform-rotatez.md)
- [WasmGPU.createTransform().rotateOnAxis](./wasmgpu-createtransform-rotateonaxis.md)
- [WasmGPU.createTransform().setRotationFromEuler](./wasmgpu-createtransform-setrotationfromeuler.md)
- [WasmGPU.createTransform().rotation](./wasmgpu-createtransform-rotation.md)
