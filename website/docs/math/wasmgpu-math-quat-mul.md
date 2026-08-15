# WasmGPU.math.quat.mul

## Summary
WasmGPU.math.quat.mul composes two quaternions through quaternion multiplication. Use it to combine successive rotations into a single quaternion.

## Syntax
```ts
WasmGPU.math.quat.mul(q1: number[], q2: number[]): number[]
const result = wgpu.math.quat.mul(q1, q2);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `q1` | `number[]` | Yes | First quaternion input as `[x, y, z, w]`. |
| `q2` | `number[]` | Yes | Second quaternion input as `[x, y, z, w]`. |

## Returns
`number[]` - New quaternion as `[x, y, z, w]`.

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
const result = wgpu.math.quat.mul(q1, q2);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.quat.init](./wasmgpu-math-quat-init.md)
- [WasmGPU.math.quat.normalize](./wasmgpu-math-quat-normalize.md)
- [WasmGPU.math.quat.slerp](./wasmgpu-math-quat-slerp.md)
