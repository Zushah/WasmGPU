# math.mat4.isEqual

## Summary
math.mat4.isEqual checks all 16 elements with exact floating-point equality. It does not apply an epsilon tolerance.

## Syntax
```ts
WasmGPU.math.mat4.isEqual(matr1: number[], matr2: number[]): boolean
const result = wgpu.math.mat4.isEqual(matr1, matr2);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.mat4f.isEqual(a: WasmPtr, b: WasmPtr): boolean
WasmGPU.math.mat4d.isEqual(a: WasmPtr, b: WasmPtr): boolean
```

These forms use caller-owned pointers to 16-element matrix blocks in WasmGPU driver memory: binary32 for `mat4f` and binary64 for `mat4d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `matr1` | `number[]` | Yes | First 4x4 matrix input (16 numbers in column-major order). |
| `matr2` | `number[]` | Yes | Second 4x4 matrix input (16 numbers in column-major order). |

## Returns
`boolean` - Boolean flag indicating whether the tested condition is satisfied.

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
const result = wgpu.math.mat4.isEqual(matr1, matr2);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [math.mat4.identity](./math-mat4-identity.md)
- [math.mat4.mul](./math-mat4-mul.md)
- [math.mat4.invert](./math-mat4-invert.md)
