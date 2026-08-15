# WasmGPU.createTransform().copyFrom

## Summary
WasmGPU.createTransform().copyFrom copies local transform components from another transform.
It copies position, rotation quaternion, and scale values, but does not copy parenting relationships.
This makes it useful for syncing poses while keeping hierarchy ownership unchanged.
The operation is chainable and marks the target transform dirty for matrix recomputation.

## Syntax
```ts
WasmGPU.createTransform().copyFrom(other: Transform): this
const result = target.copyFrom(source);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `other` | `Transform` | Yes | Source transform whose local position, rotation, and scale are copied into the current transform. |

## Returns
`this` - Returns the target transform after copying local TRS values.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const source = wgpu.createTransform().setPosition(2, 0, 1).setRotationFromEuler(0.2, 0.4, 0.1).setScale(1, 2, 1);
const target = wgpu.createTransform().setPosition(0, 0, 0);

target.copyFrom(source);
console.log(target.position, target.rotation, target.scale);
```

## See Also
- [WasmGPU.createTransform().clone](./wasmgpu-createtransform-clone.md)
- [WasmGPU.createTransform().setPosition](./wasmgpu-createtransform-setposition.md)
- [WasmGPU.createTransform().setRotation](./wasmgpu-createtransform-setrotation.md)
- [WasmGPU.createTransform().setScale](./wasmgpu-createtransform-setscale.md)
- [WasmGPU.createTransform().reset](./wasmgpu-createtransform-reset.md)
