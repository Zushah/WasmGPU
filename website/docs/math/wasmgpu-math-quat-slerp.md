# WasmGPU.math.quat.slerp

## Summary
WasmGPU.math.quat.slerp performs spherical linear interpolation between two quaternions. It provides constant-angular-velocity interpolation for smooth rotation blending.

## Syntax
```ts
WasmGPU.math.quat.slerp(q1: number[], q2: number[], t: number): number[]
const result = wgpu.math.quat.slerp(q1, q2, t);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `q1` | `number[]` | Yes | First quaternion input as `[x, y, z, w]`. |
| `q2` | `number[]` | Yes | Second quaternion input as `[x, y, z, w]`. |
| `t` | `number` | Yes | Interpolation factor, typically in the range `[0, 1]`. |

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
const t = 0.35;
const result = wgpu.math.quat.slerp(q1, q2, t);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.quat.init](./wasmgpu-math-quat-init.md)
- [WasmGPU.math.quat.mul](./wasmgpu-math-quat-mul.md)
- [WasmGPU.math.quat.normalize](./wasmgpu-math-quat-normalize.md)
