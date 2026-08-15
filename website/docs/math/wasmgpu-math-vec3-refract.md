# WasmGPU.math.vec3.refract

## Summary
WasmGPU.math.vec3.refract computes refraction direction from incident and normal vectors with an index ratio. Use it for transmission effects and optics-style vector updates.

## Syntax
```ts
WasmGPU.math.vec3.refract(v1: number[], v2: number[], refractiveIndex: number): number[]
const result = wgpu.math.vec3.refract(v1, v2, refractiveIndex);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `v1` | `number[]` | Yes | First vector input as `[x, y, z]`. |
| `v2` | `number[]` | Yes | Second vector input as `[x, y, z]`. |
| `refractiveIndex` | `number` | Yes | Relative refractive index ratio (`n1 / n2`) used for refraction. |

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
const refractiveIndex = 1.33;
const result = wgpu.math.vec3.refract(v1, v2, refractiveIndex);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.vec3.init](./wasmgpu-math-vec3-init.md)
- [WasmGPU.math.vec3.dot](./wasmgpu-math-vec3-dot.md)
- [WasmGPU.math.vec3.cross](./wasmgpu-math-vec3-cross.md)
