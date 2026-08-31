# WasmGPU.math.quat.toRotation

## Summary
WasmGPU.math.quat.toRotation rotates a 3D vector by a quaternion. Use it to transform directions without constructing a full matrix.

## Syntax
```ts
WasmGPU.math.quat.toRotation(q: number[], v: number[]): number[]
const result = wgpu.math.quat.toRotation(q, v);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.quatf.toRotation(outVec3: WasmPtr, q: WasmPtr, v3: WasmPtr): void
WasmGPU.math.quatd.toRotation(outVec3: WasmPtr, q: WasmPtr, v3: WasmPtr): void
```

These forms use caller-owned pointers to 4-element quaternion blocks in WasmGPU driver memory: binary32 for `quatf` and binary64 for `quatd`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `q` | `number[]` | Yes | Quaternion input as `[x, y, z, w]`. |
| `v` | `number[]` | Yes | Vector input as `[x, y, z]`. |

## Returns
`number[]` - Rotated vector as a 3-number array `[x, y, z]`.

## Type Details
```ts
type Quat = number[]; // expected length: 4 ([x, y, z, w])
type Vec3 = number[]; // expected length: 3 ([x, y, z])
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const q = [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)];
const v = [1, 2, 3];
const result = wgpu.math.quat.toRotation(q, v);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.quat.init](./wasmgpu-math-quat-init.md)
- [WasmGPU.math.quat.mul](./wasmgpu-math-quat-mul.md)
- [WasmGPU.math.quat.normalize](./wasmgpu-math-quat-normalize.md)
