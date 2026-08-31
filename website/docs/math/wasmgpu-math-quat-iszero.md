# WasmGPU.math.quat.isZero

## Summary
WasmGPU.math.quat.isZero checks whether every component is zero. It is useful for guarding normalization and divide operations.

## Syntax
```ts
WasmGPU.math.quat.isZero(q: number[]): boolean
const result = wgpu.math.quat.isZero(q);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.quatf.isZero(q: WasmPtr): boolean
WasmGPU.math.quatd.isZero(q: WasmPtr): boolean
```

These forms use caller-owned pointers to 4-element quaternion blocks in WasmGPU driver memory: binary32 for `quatf` and binary64 for `quatd`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `q` | `number[]` | Yes | Quaternion input as `[x, y, z, w]`. |

## Returns
`boolean` - Boolean flag indicating whether the tested condition is satisfied.

## Type Details
```ts
type Quat = number[]; // expected length: 4 ([x, y, z, w])
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const q = [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)];
const result = wgpu.math.quat.isZero(q);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.quat.init](./wasmgpu-math-quat-init.md)
- [WasmGPU.math.quat.mul](./wasmgpu-math-quat-mul.md)
- [WasmGPU.math.quat.normalize](./wasmgpu-math-quat-normalize.md)
