# WasmGPU.math.vec3.init

## Summary
WasmGPU.math.vec3.init constructs a vector from explicit x, y, and z values. Use it for clear literal vector creation.

## Syntax
```ts
WasmGPU.math.vec3.init(x: number, y: number, z: number): number[]
const result = wgpu.math.vec3.init(x, y, z);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `number` | Yes | X component value. |
| `y` | `number` | Yes | Y component value. |
| `z` | `number` | Yes | Z component value. |

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

const x = 1.0;
const y = 2.0;
const z = -0.5;
const result = wgpu.math.vec3.init(x, y, z);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.vec3.dot](./wasmgpu-math-vec3-dot.md)
- [WasmGPU.math.vec3.cross](./wasmgpu-math-vec3-cross.md)
- [WasmGPU.math.vec3.normalize](./wasmgpu-math-vec3-normalize.md)
