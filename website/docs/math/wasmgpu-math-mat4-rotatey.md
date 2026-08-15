# WasmGPU.math.mat4.rotateY

## Summary
WasmGPU.math.mat4.rotateY applies rotation around the Y axis by a radian angle. Use it for yaw-like rotations around the vertical axis.

## Syntax
```ts
WasmGPU.math.mat4.rotateY(matr: number[], angle: number): number[]
const result = wgpu.math.mat4.rotateY(matr, angle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `matr` | `number[]` | Yes | Input 4x4 matrix (16 numbers in column-major order) used by this operation. |
| `angle` | `number` | Yes | Rotation angle in radians. |

## Returns
`number[]` - New 4x4 matrix as a 16-number column-major array.

## Type Details
```ts
type Mat4 = number[]; // expected length: 16 (4x4, column-major)
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const matr = wgpu.math.mat4.translate(wgpu.math.mat4.identity(), [1, 2, 3]);
const angle = Math.PI / 4;
const result = wgpu.math.mat4.rotateY(matr, angle);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.mat4.identity](./wasmgpu-math-mat4-identity.md)
- [WasmGPU.math.mat4.mul](./wasmgpu-math-mat4-mul.md)
- [WasmGPU.math.mat4.invert](./wasmgpu-math-mat4-invert.md)
