# math.quat.invert

## Summary
math.quat.invert computes the quaternion inverse. A zero quaternion produces the identity quaternion `[0, 0, 0, 1]` rather than an error.

## Syntax
```ts
WasmGPU.math.quat.invert(q: number[]): number[]
const result = wgpu.math.quat.invert(q);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.quatf.invert(out: WasmPtr, q: WasmPtr): void
WasmGPU.math.quatd.invert(out: WasmPtr, q: WasmPtr): void
```

These forms use caller-owned pointers to 4-element quaternion blocks in WasmGPU driver memory: binary32 for `quatf` and binary64 for `quatd`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `q` | `number[]` | Yes | Quaternion input as `[x, y, z, w]`. |

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

const q = [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)];
const result = wgpu.math.quat.invert(q);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [math.quat.init](./math-quat-init.md)
- [math.quat.mul](./math-quat-mul.md)
- [math.quat.normalize](./math-quat-normalize.md)
