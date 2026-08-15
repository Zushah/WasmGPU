# WasmGPU.createTransform().rotateZ

## Summary
WasmGPU.createTransform().rotateZ applies an incremental local rotation around the Z axis.
This is often used for roll behavior and 2D-plane orientation updates.
Quaternion composition is used internally, followed by normalization.
Angles are in radians.

## Syntax
```ts
WasmGPU.createTransform().rotateZ(angle: number): this
const result = transform.rotateZ(angle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `angle` | `number` | Yes | Incremental rotation around Z axis in radians. |

## Returns
`this` - Returns the same transform after rotation.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const spriteAnchor = wgpu.createTransform();
spriteAnchor.rotateZ(Math.PI / 6).rotateZ(-Math.PI / 18);
console.log(spriteAnchor.rotation);
```

## See Also
- [WasmGPU.createTransform().rotateX](./wasmgpu-createtransform-rotatex.md)
- [WasmGPU.createTransform().rotateY](./wasmgpu-createtransform-rotatey.md)
- [WasmGPU.createTransform().rotateOnAxis](./wasmgpu-createtransform-rotateonaxis.md)
- [WasmGPU.createTransform().setRotationFromEuler](./wasmgpu-createtransform-setrotationfromeuler.md)
- [WasmGPU.createTransform().rotation](./wasmgpu-createtransform-rotation.md)
