# WasmGPU.createTransform().setRotationFromAxisAngle

## Summary
WasmGPU.createTransform().setRotationFromAxisAngle sets local orientation from an axis-angle pair.
The axis vector is normalized internally, then converted into a quaternion.
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
| `axis` | `number[]` | Yes | Rotation axis as three numeric components; it is normalized internally. |
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
- [WasmGPU.createTransform().setRotation](./wasmgpu-createtransform-setrotation.md)
- [WasmGPU.createTransform().setRotationFromEuler](./wasmgpu-createtransform-setrotationfromeuler.md)
- [WasmGPU.createTransform().rotateOnAxis](./wasmgpu-createtransform-rotateonaxis.md)
- [WasmGPU.createTransform().rotateY](./wasmgpu-createtransform-rotatey.md)
- [WasmGPU.createTransform().rotation](./wasmgpu-createtransform-rotation.md)
