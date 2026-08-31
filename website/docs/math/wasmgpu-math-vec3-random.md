# WasmGPU.math.vec3.random

## Summary
WasmGPU.math.vec3.random generates a random value within the provided numeric range. Use it to synthesize test data or randomized initialization.

## Syntax
```ts
WasmGPU.math.vec3.random(min: number, max: number): number[]
const result = wgpu.math.vec3.random(min, max);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.vec3f.random(out: WasmPtr): void
WasmGPU.math.vec3d.random(out: WasmPtr): void
WasmGPU.math.vec3f.randomRange(out: WasmPtr, min: number, max: number): void
WasmGPU.math.vec3d.randomRange(out: WasmPtr, min: number, max: number): void
```

These forms use caller-owned pointers to 3-element vector blocks in WasmGPU driver memory: binary32 for `vec3f` and binary64 for `vec3d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `min` | `number` | Yes | Minimum random bound (inclusive lower bound). |
| `max` | `number` | Yes | Maximum random bound (inclusive upper bound); should be >= `min`. |

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

const min = -1.0;
const max = 1.0;
const result = wgpu.math.vec3.random(min, max);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.vec3.init](./wasmgpu-math-vec3-init.md)
- [WasmGPU.math.vec3.dot](./wasmgpu-math-vec3-dot.md)
- [WasmGPU.math.vec3.cross](./wasmgpu-math-vec3-cross.md)
