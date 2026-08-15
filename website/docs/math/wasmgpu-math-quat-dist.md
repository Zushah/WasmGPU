# WasmGPU.math.quat.dist

## Summary
WasmGPU.math.quat.dist computes Euclidean distance between two inputs. Use it when you need physical separation in metric units.

## Syntax
```ts
WasmGPU.math.quat.dist(q1: number[], q2: number[]): number
const result = wgpu.math.quat.dist(q1, q2);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `q1` | `number[]` | Yes | First quaternion input as `[x, y, z, w]`. |
| `q2` | `number[]` | Yes | Second quaternion input as `[x, y, z, w]`. |

## Returns
`number` - Euclidean distance between the two inputs.

## Type Details
```ts
type Quat = number[]; // expected length: 4 ([x, y, z, w])
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const q1 = [0, 0, 0, 1];
const q2 = [0, Math.sin(Math.PI / 4), 0, Math.cos(Math.PI / 4)];
const result = wgpu.math.quat.dist(q1, q2);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.quat.init](./wasmgpu-math-quat-init.md)
- [WasmGPU.math.quat.mul](./wasmgpu-math-quat-mul.md)
- [WasmGPU.math.quat.normalize](./wasmgpu-math-quat-normalize.md)
