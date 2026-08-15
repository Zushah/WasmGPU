# WasmGPU.createTransform().rotateY

## Summary
WasmGPU.createTransform().rotateY applies an incremental local rotation around the Y axis.
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
- [WasmGPU.createTransform().rotateX](./wasmgpu-createtransform-rotatex.md)
- [WasmGPU.createTransform().rotateZ](./wasmgpu-createtransform-rotatez.md)
- [WasmGPU.createTransform().rotateOnAxis](./wasmgpu-createtransform-rotateonaxis.md)
- [WasmGPU.createTransform().setRotation](./wasmgpu-createtransform-setrotation.md)
- [WasmGPU.createTransform().rotation](./wasmgpu-createtransform-rotation.md)
