# WasmGPU.math.vec3.scl

## Summary
WasmGPU.math.vec3.scl scales the input by a scalar factor. Use it for uniform amplitude, size, or magnitude scaling.

## Syntax
```ts
WasmGPU.math.vec3.scl(v: number[], scalar: number): number[]
const result = wgpu.math.vec3.scl(v, scalar);
```

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
const result = wgpu.math.vec3.scl(v, scalar);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.vec3.init](./wasmgpu-math-vec3-init.md)
- [WasmGPU.math.vec3.dot](./wasmgpu-math-vec3-dot.md)
- [WasmGPU.math.vec3.cross](./wasmgpu-math-vec3-cross.md)
