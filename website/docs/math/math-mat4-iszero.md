# math.mat4.isZero

## Summary
math.mat4.isZero checks whether every component is exactly zero. It does not apply an epsilon tolerance.

## Syntax
```ts
WasmGPU.math.mat4.isZero(matr: number[]): boolean
const result = wgpu.math.mat4.isZero(matr);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.mat4f.isZero(m: WasmPtr): boolean
WasmGPU.math.mat4d.isZero(m: WasmPtr): boolean
```

These forms use caller-owned pointers to 16-element matrix blocks in WasmGPU driver memory: binary32 for `mat4f` and binary64 for `mat4d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `matr` | `number[]` | Yes | Column-major 4x4 matrix to test for all-zero elements. |

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

const matr = wgpu.math.mat4.translate(wgpu.math.mat4.identity(), [1, 2, 3]);
const result = wgpu.math.mat4.isZero(matr);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [math.mat4.identity](./math-mat4-identity.md)
- [math.mat4.mul](./math-mat4-mul.md)
- [math.mat4.invert](./math-mat4-invert.md)
