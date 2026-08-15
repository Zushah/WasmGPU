# WasmGPU.math.vec3.ang

## Summary
WasmGPU.math.vec3.ang computes component-wise angular representation of a vector. Use it for directional diagnostics or angle-based post-processing.

## Syntax
```ts
WasmGPU.math.vec3.ang(v: number[]): number[]
const result = wgpu.math.vec3.ang(v);
```

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
- [WasmGPU.math.vec3.init](./wasmgpu-math-vec3-init.md)
- [WasmGPU.math.vec3.dot](./wasmgpu-math-vec3-dot.md)
- [WasmGPU.math.vec3.cross](./wasmgpu-math-vec3-cross.md)
