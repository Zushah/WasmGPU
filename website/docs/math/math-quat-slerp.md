# math.quat.slerp

## Summary
math.quat.slerp performs spherical linear interpolation between two quaternions. It provides constant-angular-velocity interpolation for smooth rotation blending.

## Syntax
```ts
WasmGPU.math.quat.slerp(q1: number[], q2: number[], t: number): number[]
const result = wgpu.math.quat.slerp(q1, q2, t);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.quatf.slerp(out: WasmPtr, a: WasmPtr, b: WasmPtr, t: number): void
WasmGPU.math.quatd.slerp(out: WasmPtr, a: WasmPtr, b: WasmPtr, t: number): void
```

These forms use caller-owned pointers to 4-element quaternion blocks in WasmGPU driver memory: binary32 for `quatf` and binary64 for `quatd`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `q1` | `number[]` | Yes | First quaternion input as `[x, y, z, w]`. |
| `q2` | `number[]` | Yes | Second quaternion input as `[x, y, z, w]`. |
| `t` | `number` | Yes | Interpolation factor, typically in the range `[0, 1]`. |

Inputs are expected to be unit quaternions. Interpolation follows the shortest quaternion arc. Values of `t` in `[0, 1]` interpolate between the inputs, while values outside that interval extrapolate.

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
- [math.quat.init](./math-quat-init.md)
- [math.quat.mul](./math-quat-mul.md)
- [math.quat.normalize](./math-quat-normalize.md)
