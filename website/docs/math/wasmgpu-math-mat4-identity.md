# WasmGPU.math.mat4.identity

## Summary
WasmGPU.math.mat4.identity creates an identity matrix. This is the standard neutral element for matrix multiplication.

## Syntax
```ts
WasmGPU.math.mat4.identity(): number[]
const result = wgpu.math.mat4.identity();
```

## Parameters
This function does not take parameters.

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

const result = wgpu.math.mat4.identity();
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.mat4.mul](./wasmgpu-math-mat4-mul.md)
- [WasmGPU.math.mat4.invert](./wasmgpu-math-mat4-invert.md)
- [WasmGPU.math.mat4.translate](./wasmgpu-math-mat4-translate.md)
