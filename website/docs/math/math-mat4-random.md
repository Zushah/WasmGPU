# math.mat4.random

## Summary
math.mat4.random creates a new 4x4 matrix whose 16 components are sampled independently from the provided numeric range.
The result is unconstrained random data, not necessarily a valid affine or projection transform.

## Syntax
```ts
WasmGPU.math.mat4.random(min: number, max: number): number[]
const result = wgpu.math.mat4.random(min, max);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.mat4f.random(out: WasmPtr): void
WasmGPU.math.mat4d.random(out: WasmPtr): void
WasmGPU.math.mat4f.randomRange(out: WasmPtr, min: number, max: number): void
WasmGPU.math.mat4d.randomRange(out: WasmPtr, min: number, max: number): void
```

These forms use caller-owned pointers to 16-element matrix blocks in WasmGPU driver memory: binary32 for `mat4f` and binary64 for `mat4d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `min` | `number` | Yes | Minimum random bound (inclusive lower bound). |
| `max` | `number` | Yes | Maximum random bound (inclusive upper bound); should be >= `min`. |

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

const min = -1.0;
const max = 1.0;
const result = wgpu.math.mat4.random(min, max);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [math.mat4.identity](./math-mat4-identity.md)
- [math.mat4.mul](./math-mat4-mul.md)
- [math.mat4.invert](./math-mat4-invert.md)
