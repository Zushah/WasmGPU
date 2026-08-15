# WasmGPU.math.vec3.distsq

## Summary
WasmGPU.math.vec3.distsq computes squared distance between two inputs. Prefer it for comparisons where square root is unnecessary.

## Syntax
```ts
WasmGPU.math.vec3.distsq(v1: number[], v2: number[]): number
const result = wgpu.math.vec3.distsq(v1, v2);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `v1` | `number[]` | Yes | First vector input as `[x, y, z]`. |
| `v2` | `number[]` | Yes | Second vector input as `[x, y, z]`. |

## Returns
`number` - Squared Euclidean distance between the two inputs.

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
const result = wgpu.math.vec3.distsq(v1, v2);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.vec3.init](./wasmgpu-math-vec3-init.md)
- [WasmGPU.math.vec3.dot](./wasmgpu-math-vec3-dot.md)
- [WasmGPU.math.vec3.cross](./wasmgpu-math-vec3-cross.md)
