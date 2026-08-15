# WasmGPU.createTransform().rotateOnAxis

## Summary
WasmGPU.createTransform().rotateOnAxis applies an incremental local rotation around an arbitrary axis.
It multiplies the current quaternion by an axis-angle quaternion and normalizes the result.
Use this for continuous spinning or controller-driven angular updates.
The axis is normalized internally and `angle` is in radians.

## Syntax
```ts
WasmGPU.createTransform().rotateOnAxis(axis: number[], angle: number): this
const result = transform.rotateOnAxis(axis, angle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `axis` | `number[]` | Yes | Rotation axis as three components; normalization is handled internally. |
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
- [WasmGPU.createTransform().setRotationFromAxisAngle](./wasmgpu-createtransform-setrotationfromaxisangle.md)
- [WasmGPU.createTransform().rotateX](./wasmgpu-createtransform-rotatex.md)
- [WasmGPU.createTransform().rotateY](./wasmgpu-createtransform-rotatey.md)
- [WasmGPU.createTransform().rotateZ](./wasmgpu-createtransform-rotatez.md)
- [WasmGPU.createTransform().rotation](./wasmgpu-createtransform-rotation.md)
