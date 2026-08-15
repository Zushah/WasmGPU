# WasmGPU.createTransform().setRotationFromEuler

## Summary
WasmGPU.createTransform().setRotationFromEuler sets local orientation from Euler angles.
Angles are interpreted in radians and converted to a quaternion internally.
This is useful for UI sliders or human-readable orientation input.
For simulation-grade pipelines, prefer direct quaternion APIs to avoid Euler composition ambiguity.

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
- [WasmGPU.createTransform().setRotation](./wasmgpu-createtransform-setrotation.md)
- [WasmGPU.createTransform().setRotationFromAxisAngle](./wasmgpu-createtransform-setrotationfromaxisangle.md)
- [WasmGPU.createTransform().rotateX](./wasmgpu-createtransform-rotatex.md)
- [WasmGPU.createTransform().rotateY](./wasmgpu-createtransform-rotatey.md)
- [WasmGPU.createTransform().rotation](./wasmgpu-createtransform-rotation.md)
