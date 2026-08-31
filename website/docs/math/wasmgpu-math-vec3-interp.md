# WasmGPU.math.vec3.interp

## Summary
WasmGPU.math.vec3.interp computes a weighted interpolation from a base vector and three scalar weights. Use it for custom blend and basis-combination workflows.

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
`number[]` - New 3D vector as `[x, y, z]`.

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
- [WasmGPU.math.vec3.init](./wasmgpu-math-vec3-init.md)
- [WasmGPU.math.vec3.dot](./wasmgpu-math-vec3-dot.md)
- [WasmGPU.math.vec3.cross](./wasmgpu-math-vec3-cross.md)
