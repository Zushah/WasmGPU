# WasmGPU.math.mat4.print

## Summary
WasmGPU.math.mat4.print prints a formatted representation to the console. Use it for quick debugging of runtime math values.

## Syntax
```ts
WasmGPU.math.mat4.print(matr: number[]): void
wgpu.math.mat4.print(matr);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.mat4f.print(m: WasmPtr): void
WasmGPU.math.mat4d.print(m: WasmPtr): void
```

These forms use caller-owned pointers to 16-element matrix blocks in WasmGPU driver memory: binary32 for `mat4f` and binary64 for `mat4d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `matr` | `number[]` | Yes | Input 4x4 matrix (16 numbers in column-major order) used by this operation. |

## Returns
`void` - No return value. The formatted value is written to the browser console.

## Type Details
```ts
type Mat4 = number[]; // expected length: 16 (4x4, column-major)
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const matr = wgpu.math.mat4.translate(wgpu.math.mat4.identity(), [1, 2, 3]);
wgpu.math.mat4.print(matr);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.mat4.identity](./wasmgpu-math-mat4-identity.md)
- [WasmGPU.math.mat4.mul](./wasmgpu-math-mat4-mul.md)
- [WasmGPU.math.mat4.invert](./wasmgpu-math-mat4-invert.md)
