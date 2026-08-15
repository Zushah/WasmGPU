# WasmGPU.createTransform().setRotation

## Summary
WasmGPU.createTransform().setRotation sets local orientation from quaternion components.
The quaternion is normalized internally to keep orientation math stable.
Use this when orientation already exists in quaternion form, for example from simulation or imported animation data.
Input ordering is `[x, y, z, w]`.

## Syntax
```ts
WasmGPU.createTransform().setRotation(x: number, y: number, z: number, w: number): this
const result = transform.setRotation(x, y, z, w);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `number` | Yes | Quaternion X component. |
| `y` | `number` | Yes | Quaternion Y component. |
| `z` | `number` | Yes | Quaternion Z component. |
| `w` | `number` | Yes | Quaternion W component (scalar part). |

## Returns
`this` - Returns the same transform after updating orientation.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const t = wgpu.createTransform();
const s = Math.sin(Math.PI / 8);
const c = Math.cos(Math.PI / 8);
t.setRotation(0, s, 0, c);

console.log(t.rotation);
```

## See Also
- [WasmGPU.createTransform().rotation](./wasmgpu-createtransform-rotation.md)
- [WasmGPU.createTransform().setRotationFromEuler](./wasmgpu-createtransform-setrotationfromeuler.md)
- [WasmGPU.createTransform().setRotationFromAxisAngle](./wasmgpu-createtransform-setrotationfromaxisangle.md)
- [WasmGPU.createTransform().rotateY](./wasmgpu-createtransform-rotatey.md)
- [WasmGPU.createTransform().rotationPtr](./wasmgpu-createtransform-rotationptr.md)
