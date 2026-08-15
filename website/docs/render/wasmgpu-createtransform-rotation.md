# WasmGPU.createTransform().rotation

## Summary
WasmGPU.createTransform().rotation returns the local rotation quaternion.
Quaternion order is `[x, y, z, w]` and is normalized by rotation mutator APIs.
Use quaternion values for interpolation, rigid-body orientation, and stable 3D rotations without gimbal lock.
For user-friendly angle input, use `setRotationFromEuler` or `setRotationFromAxisAngle`.

## Syntax
```ts
WasmGPU.createTransform().rotation: number[]
const quaternion = transform.rotation;
```

## Parameters
This API does not take parameters.

## Returns
`number[]` - Local rotation quaternion as `[x, y, z, w]`.

## Type Details
```ts
type Quaternion = [number, number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const t = wgpu.createTransform().setRotationFromEuler(0, Math.PI / 2, 0);
const [x, y, z, w] = t.rotation;
console.log(x, y, z, w);
```

## See Also
- [WasmGPU.createTransform().setRotation](./wasmgpu-createtransform-setrotation.md)
- [WasmGPU.createTransform().setRotationFromEuler](./wasmgpu-createtransform-setrotationfromeuler.md)
- [WasmGPU.createTransform().setRotationFromAxisAngle](./wasmgpu-createtransform-setrotationfromaxisangle.md)
- [WasmGPU.createTransform().rotationPtr](./wasmgpu-createtransform-rotationptr.md)
- [WasmGPU.createTransform().worldMatrix](./wasmgpu-createtransform-worldmatrix.md)
