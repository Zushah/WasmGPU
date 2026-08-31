# WasmGPU.math.quat.distsq

## Summary
WasmGPU.math.quat.distsq computes squared distance between two inputs. Prefer it for comparisons where square root is unnecessary.

## Syntax
```ts
WasmGPU.math.quat.distsq(q1: number[], q2: number[]): number
const result = wgpu.math.quat.distsq(q1, q2);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.quatf.distsq(a: WasmPtr, b: WasmPtr): number
WasmGPU.math.quatd.distsq(a: WasmPtr, b: WasmPtr): number
```

These forms use caller-owned pointers to 4-element quaternion blocks in WasmGPU driver memory: binary32 for `quatf` and binary64 for `quatd`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `q1` | `number[]` | Yes | First quaternion input as `[x, y, z, w]`. |
| `q2` | `number[]` | Yes | Second quaternion input as `[x, y, z, w]`. |

## Returns
`number` - Squared Euclidean distance between the two inputs.

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
const result = wgpu.math.quat.distsq(q1, q2);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.quat.init](./wasmgpu-math-quat-init.md)
- [WasmGPU.math.quat.mul](./wasmgpu-math-quat-mul.md)
- [WasmGPU.math.quat.normalize](./wasmgpu-math-quat-normalize.md)
