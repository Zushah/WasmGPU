# math.vec3.ang

## Summary
math.vec3.ang returns each component's direction angle as `acos(component / length)` in radians. A zero vector produces non-finite component results.

## Syntax
```ts
WasmGPU.math.vec3.ang(v: number[]): number[]
const result = wgpu.math.vec3.ang(v);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.vec3f.ang(out: WasmPtr, v: WasmPtr): void
WasmGPU.math.vec3d.ang(out: WasmPtr, v: WasmPtr): void
```

These forms use caller-owned pointers to 3-element vector blocks in WasmGPU driver memory: binary32 for `vec3f` and binary64 for `vec3d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `v` | `number[]` | Yes | Vector input as `[x, y, z]`. |

## Returns
`number[]` - Vector of component angles derived from the input.

## Type Details
```ts
type Vec3 = number[]; // expected length: 3 ([x, y, z])
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const v = [1, 2, 3];
const result = wgpu.math.vec3.ang(v);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [math.vec3.init](./math-vec3-init.md)
- [math.vec3.dot](./math-vec3-dot.md)
- [math.vec3.cross](./math-vec3-cross.md)
