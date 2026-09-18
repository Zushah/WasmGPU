# math.vec3.oproj

## Summary
math.vec3.oproj computes the orthogonal projection component of one vector relative to another. Use it when separating parallel and perpendicular components.

## Syntax
```ts
WasmGPU.math.vec3.oproj(v1: number[], v2: number[]): number[]
const result = wgpu.math.vec3.oproj(v1, v2);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.vec3f.oproj(out: WasmPtr, a: WasmPtr, b: WasmPtr): void
WasmGPU.math.vec3d.oproj(out: WasmPtr, a: WasmPtr, b: WasmPtr): void
```

These forms use caller-owned pointers to 3-element vector blocks in WasmGPU driver memory: binary32 for `vec3f` and binary64 for `vec3d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `v1` | `number[]` | Yes | First vector input as `[x, y, z]`. |
| `v2` | `number[]` | Yes | Second vector input as `[x, y, z]`. |

This returns `v1 - proj(v1, v2)`. If `v2` is the zero vector, the result is a copy of `v1`.

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

const v1 = [1, -1, 0.5];
const v2 = [0, 1, 0];
const result = wgpu.math.vec3.oproj(v1, v2);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [math.vec3.init](./math-vec3-init.md)
- [math.vec3.dot](./math-vec3-dot.md)
- [math.vec3.cross](./math-vec3-cross.md)
