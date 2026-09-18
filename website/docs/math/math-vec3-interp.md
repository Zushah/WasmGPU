# math.vec3.interp

## Summary
math.vec3.interp computes the weighted mean `(a*x + b*y + c*z) / (a+b+c)` and writes that same scalar to all three output components. It is not a conventional interpolation between vectors.

## Syntax
```ts
WasmGPU.math.vec3.interp(v: number[], a: number, b: number, c: number): number[]
const result = wgpu.math.vec3.interp(v, a, b, c);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.vec3f.interp(out: WasmPtr, v: WasmPtr, a: number, b: number, c: number): void
WasmGPU.math.vec3d.interp(out: WasmPtr, v: WasmPtr, a: number, b: number, c: number): void
```

These forms use caller-owned pointers to 3-element vector blocks in WasmGPU driver memory: binary32 for `vec3f` and binary64 for `vec3d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `v` | `number[]` | Yes | Vector input as `[x, y, z]`. |
| `a` | `number` | Yes | Weight for the x-component contribution in interpolation. |
| `b` | `number` | Yes | Weight for the y-component contribution in interpolation. |
| `c` | `number` | Yes | Weight for the z-component contribution in interpolation. |

## Returns
`number[]` - Three copies of the weighted component mean. If the weights sum to zero, the components are non-finite.

## Type Details
```ts
type Vec3 = number[]; // expected length: 3 ([x, y, z])
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const v = [1, 2, 3];
const a = 0.2;
const b = 0.3;
const c = 0.5;
const result = wgpu.math.vec3.interp(v, a, b, c);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [math.vec3.init](./math-vec3-init.md)
- [math.vec3.dot](./math-vec3-dot.md)
- [math.vec3.cross](./math-vec3-cross.md)
