# WasmGPU.math.vec3.normscl

## Summary
WasmGPU.math.vec3.normscl normalizes the input and then applies a scalar magnitude. Use it when you need a direction with a prescribed length.

## Syntax
```ts
WasmGPU.math.vec3.normscl(v: number[], scalar: number): number[]
const result = wgpu.math.vec3.normscl(v, scalar);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.vec3f.normscl(out: WasmPtr, v: WasmPtr, scalar: number): void
WasmGPU.math.vec3d.normscl(out: WasmPtr, v: WasmPtr, scalar: number): void
```

These forms use caller-owned pointers to 3-element vector blocks in WasmGPU driver memory: binary32 for `vec3f` and binary64 for `vec3d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `v` | `number[]` | Yes | Vector input as `[x, y, z]`. |
| `scalar` | `number` | Yes | Scalar factor used to uniformly scale components. |

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
const scalar = 0.5;
const result = wgpu.math.vec3.normscl(v, scalar);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.vec3.init](./wasmgpu-math-vec3-init.md)
- [WasmGPU.math.vec3.dot](./wasmgpu-math-vec3-dot.md)
- [WasmGPU.math.vec3.cross](./wasmgpu-math-vec3-cross.md)
