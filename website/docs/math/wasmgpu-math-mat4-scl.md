# WasmGPU.math.mat4.scl

## Summary
WasmGPU.math.mat4.scl scales the input by a scalar factor. Use it for uniform amplitude, size, or magnitude scaling.

## Syntax
```ts
WasmGPU.math.mat4.scl(matr: number[], scalar: number): number[]
const result = wgpu.math.mat4.scl(matr, scalar);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.mat4f.scl(out: WasmPtr, m: WasmPtr, scalar: number): void
WasmGPU.math.mat4d.scl(out: WasmPtr, m: WasmPtr, scalar: number): void
```

These forms use caller-owned pointers to 16-element matrix blocks in WasmGPU driver memory: binary32 for `mat4f` and binary64 for `mat4d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `matr` | `number[]` | Yes | Input 4x4 matrix (16 numbers in column-major order) used by this operation. |
| `scalar` | `number` | Yes | Scalar factor used to uniformly scale components. |

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
const scalar = 0.5;
const result = wgpu.math.mat4.scl(matr, scalar);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.mat4.identity](./wasmgpu-math-mat4-identity.md)
- [WasmGPU.math.mat4.mul](./wasmgpu-math-mat4-mul.md)
- [WasmGPU.math.mat4.invert](./wasmgpu-math-mat4-invert.md)
