# WasmGPU.math.mat4.mul

## Summary
WasmGPU.math.mat4.mul multiplies a matrix by another matrix or by a 4-component vector. Use it to compose transforms or apply a transform to homogeneous coordinates.

## Syntax
```ts
WasmGPU.math.mat4.mul(matr1: number[], matr2ORvect: number[]): number[]
const result = wgpu.math.mat4.mul(matr1, matr2ORvect);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.mat4f.mul(out: WasmPtr, a: WasmPtr, b: WasmPtr): void
WasmGPU.math.mat4d.mul(out: WasmPtr, a: WasmPtr, b: WasmPtr): void
WasmGPU.math.mat4f.mulVec4(outVec4: WasmPtr, m: WasmPtr, v4: WasmPtr): void
WasmGPU.math.mat4d.mulVec4(outVec4: WasmPtr, m: WasmPtr, v4: WasmPtr): void
```

These forms use caller-owned pointers to 16-element matrix blocks in WasmGPU driver memory: binary32 for `mat4f` and binary64 for `mat4d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `matr1` | `number[]` | Yes | First 4x4 matrix input (16 numbers in column-major order). |
| `matr2ORvect` | `number[]` | Yes | Second operand: pass 16 numbers for matrix-matrix multiplication or 4 numbers for matrix-vector multiplication. |

## Returns
`number[]` - Computed product array: 16 values for matrix-matrix multiply or 4 values for matrix-vector multiply.

## Type Details
```ts
type Mat4 = number[]; // expected length: 16 (4x4, column-major)
type Mat4OrVec4 = number[]; // 16 values for matrix multiply, or 4 values for matrix-vector multiply
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const matr1 = wgpu.math.mat4.identity();
const matr2ORvect = wgpu.math.mat4.translate(wgpu.math.mat4.identity(), [0, 0, -2]);
const result = wgpu.math.mat4.mul(matr1, matr2ORvect);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.mat4.identity](./wasmgpu-math-mat4-identity.md)
- [WasmGPU.math.mat4.invert](./wasmgpu-math-mat4-invert.md)
- [WasmGPU.math.mat4.translate](./wasmgpu-math-mat4-translate.md)
