# WasmGPU.math.mat4.init

## Summary
WasmGPU.math.mat4.init builds a matrix from explicit component values. Use it when you need exact control of every matrix element.

## Syntax
```ts
WasmGPU.math.mat4.init(m0: number, m1: number, m2: number, m3: number, m4: number, m5: number, m6: number, m7: number, m8: number, m9: number, m10: number, m11: number, m12: number, m13: number, m14: number, m15: number): number[]
const result = wgpu.math.mat4.init(m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.mat4f.init(out: WasmPtr, m0: number, m1: number, m2: number, m3: number, m4: number, m5: number, m6: number, m7: number, m8: number, m9: number, m10: number, m11: number, m12: number, m13: number, m14: number, m15: number): void
WasmGPU.math.mat4d.init(out: WasmPtr, m0: number, m1: number, m2: number, m3: number, m4: number, m5: number, m6: number, m7: number, m8: number, m9: number, m10: number, m11: number, m12: number, m13: number, m14: number, m15: number): void
WasmGPU.math.mat4f.decomposeTRS(outTrs: WasmPtr, m: WasmPtr): void
WasmGPU.math.mat4d.decomposeTRS(outTrs: WasmPtr, m: WasmPtr): void
```

These forms use caller-owned pointers to 16-element matrix blocks in WasmGPU driver memory: binary32 for `mat4f` and binary64 for `mat4d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `m0` | `number` | Yes | Matrix element at row 0, column 0 of the 4x4 literal. |
| `m1` | `number` | Yes | Matrix element at row 0, column 1 of the 4x4 literal. |
| `m2` | `number` | Yes | Matrix element at row 0, column 2 of the 4x4 literal. |
| `m3` | `number` | Yes | Matrix element at row 0, column 3 of the 4x4 literal. |
| `m4` | `number` | Yes | Matrix element at row 1, column 0 of the 4x4 literal. |
| `m5` | `number` | Yes | Matrix element at row 1, column 1 of the 4x4 literal. |
| `m6` | `number` | Yes | Matrix element at row 1, column 2 of the 4x4 literal. |
| `m7` | `number` | Yes | Matrix element at row 1, column 3 of the 4x4 literal. |
| `m8` | `number` | Yes | Matrix element at row 2, column 0 of the 4x4 literal. |
| `m9` | `number` | Yes | Matrix element at row 2, column 1 of the 4x4 literal. |
| `m10` | `number` | Yes | Matrix element at row 2, column 2 of the 4x4 literal. |
| `m11` | `number` | Yes | Matrix element at row 2, column 3 of the 4x4 literal. |
| `m12` | `number` | Yes | Matrix element at row 3, column 0 of the 4x4 literal. |
| `m13` | `number` | Yes | Matrix element at row 3, column 1 of the 4x4 literal. |
| `m14` | `number` | Yes | Matrix element at row 3, column 2 of the 4x4 literal. |
| `m15` | `number` | Yes | Matrix element at row 3, column 3 of the 4x4 literal. |

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

const m0 = 1;
const m1 = 0;
const m2 = 0;
const m3 = 0;
const m4 = 0;
const m5 = 1;
const m6 = 0;
const m7 = 0;
const m8 = 0;
const m9 = 0;
const m10 = 1;
const m11 = 0;
const m12 = 0;
const m13 = 0;
const m14 = 0;
const m15 = 1;
const result = wgpu.math.mat4.init(m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.mat4.identity](./wasmgpu-math-mat4-identity.md)
- [WasmGPU.math.mat4.mul](./wasmgpu-math-mat4-mul.md)
- [WasmGPU.math.mat4.invert](./wasmgpu-math-mat4-invert.md)
