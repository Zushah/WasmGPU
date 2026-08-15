# WasmGPU.createTransform().setUniformScale

## Summary
WasmGPU.createTransform().setUniformScale sets the same local scale factor on all three axes.
It is a convenience wrapper around `setScale(s, s, s)`.
Use this for isotropic resize operations where shape proportions should be preserved.
The method marks the transform dirty exactly like `setScale`.

## Syntax
```ts
WasmGPU.createTransform().setUniformScale(scalar: number): this
const result = transform.setUniformScale(scalar);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `scalar` | `number` | Yes | Uniform scale factor applied to X, Y, and Z. |

## Returns
`this` - Returns the same transform after applying uniform scale.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const marker = wgpu.createTransform();
marker.setUniformScale(0.75).setPosition(0, 0.5, 0);

console.log(marker.scale);
```

## See Also
- [WasmGPU.createTransform().setScale](./wasmgpu-createtransform-setscale.md)
- [WasmGPU.createTransform().scale](./wasmgpu-createtransform-scale.md)
- [WasmGPU.createTransform().worldMatrix](./wasmgpu-createtransform-worldmatrix.md)
- [WasmGPU.createTransform().setPosition](./wasmgpu-createtransform-setposition.md)
- [WasmGPU.createTransform().reset](./wasmgpu-createtransform-reset.md)
