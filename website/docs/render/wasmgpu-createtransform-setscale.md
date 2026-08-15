# WasmGPU.createTransform().setScale

## Summary
WasmGPU.createTransform().setScale sets local non-uniform scale along each axis.
Use this for anisotropic scaling where each axis needs an independent factor.
The method writes directly into the transform store and marks the node dirty for matrix update.
Scaling interacts with parent transforms through normal hierarchy composition.

## Syntax
```ts
WasmGPU.createTransform().setScale(x: number, y: number, z: number): this
const result = transform.setScale(x, y, z);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `number` | Yes | Local scale factor on X axis. |
| `y` | `number` | Yes | Local scale factor on Y axis. |
| `z` | `number` | Yes | Local scale factor on Z axis. |

## Returns
`this` - Returns the same transform after updating local scale.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const bar = wgpu.createTransform();
bar.setScale(3.0, 0.25, 0.25);
bar.setPosition(0, 1, 0);

console.log(bar.scale, bar.localMatrix);
```

## See Also
- [WasmGPU.createTransform().scale](./wasmgpu-createtransform-scale.md)
- [WasmGPU.createTransform().setUniformScale](./wasmgpu-createtransform-setuniformscale.md)
- [WasmGPU.createTransform().localMatrix](./wasmgpu-createtransform-localmatrix.md)
- [WasmGPU.createTransform().setPosition](./wasmgpu-createtransform-setposition.md)
- [WasmGPU.createTransform().setRotation](./wasmgpu-createtransform-setrotation.md)
