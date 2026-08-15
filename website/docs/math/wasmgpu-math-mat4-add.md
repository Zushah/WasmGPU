# WasmGPU.math.mat4.add

## Summary
WasmGPU.math.mat4.add computes a component-wise sum of two inputs. This is useful for linear accumulation and incremental updates.

## Syntax
```ts
WasmGPU.math.mat4.add(matr1: number[], matr2: number[]): number[]
const result = wgpu.math.mat4.add(matr1, matr2);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `matr1` | `number[]` | Yes | First 4x4 matrix input (16 numbers in column-major order). |
| `matr2` | `number[]` | Yes | Second 4x4 matrix input (16 numbers in column-major order). |

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

const matr1 = wgpu.math.mat4.identity();
const matr2 = wgpu.math.mat4.rotateY(wgpu.math.mat4.identity(), Math.PI / 6);
const result = wgpu.math.mat4.add(matr1, matr2);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.mat4.identity](./wasmgpu-math-mat4-identity.md)
- [WasmGPU.math.mat4.mul](./wasmgpu-math-mat4-mul.md)
- [WasmGPU.math.mat4.invert](./wasmgpu-math-mat4-invert.md)
