# WasmGPU.math.quat.fromAxisAngle

## Summary
WasmGPU.math.quat.fromAxisAngle builds a quaternion from an axis and a radian angle. It is the standard bridge from geometric axis-angle to quaternion rotation.

## Syntax
```ts
WasmGPU.math.quat.fromAxisAngle(axis: number[], angle: number): number[]
const result = wgpu.math.quat.fromAxisAngle(axis, angle);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.quatf.fromAxisAngle(out: WasmPtr, axis3: WasmPtr, angle: number): void
WasmGPU.math.quatd.fromAxisAngle(out: WasmPtr, axis3: WasmPtr, angle: number): void
```

These forms use caller-owned pointers to 4-element quaternion blocks in WasmGPU driver memory: binary32 for `quatf` and binary64 for `quatd`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `axis` | `number[]` | Yes | Rotation axis `[x, y, z]`; normalize for predictable results. |
| `angle` | `number` | Yes | Rotation angle in radians. |

## Returns
`number[]` - New quaternion as `[x, y, z, w]`.

## Type Details
```ts
type Quat = number[]; // expected length: 4 ([x, y, z, w])
type Vec3 = number[]; // expected length: 3 ([x, y, z])
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const axis = [0, 1, 0];
const angle = Math.PI / 4;
const result = wgpu.math.quat.fromAxisAngle(axis, angle);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.quat.init](./wasmgpu-math-quat-init.md)
- [WasmGPU.math.quat.mul](./wasmgpu-math-quat-mul.md)
- [WasmGPU.math.quat.normalize](./wasmgpu-math-quat-normalize.md)
