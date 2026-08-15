# WasmGPU.math.mat4.translate

## Summary
WasmGPU.math.mat4.translate applies translation to a matrix using a 3D vector. Use it to move objects or coordinate frames in world space.

## Syntax
```ts
WasmGPU.math.mat4.translate(matr: number[], vect: number[]): number[]
const result = wgpu.math.mat4.translate(matr, vect);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `matr` | `number[]` | Yes | Input 4x4 matrix (16 numbers in column-major order) used by this operation. |
| `vect` | `number[]` | Yes | Translation vector `[x, y, z]`. |

## Returns
`number[]` - New 4x4 matrix as a 16-number column-major array.

## Type Details
```ts
type Mat4 = number[]; // expected length: 16 (4x4, column-major)
type Vec3 = number[]; // expected length: 3 ([x, y, z])
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const matr = wgpu.math.mat4.translate(wgpu.math.mat4.identity(), [1, 2, 3]);
const vect = [2, 0, -5];
const result = wgpu.math.mat4.translate(matr, vect);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.mat4.identity](./wasmgpu-math-mat4-identity.md)
- [WasmGPU.math.mat4.mul](./wasmgpu-math-mat4-mul.md)
- [WasmGPU.math.mat4.invert](./wasmgpu-math-mat4-invert.md)
