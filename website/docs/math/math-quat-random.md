# math.quat.random

## Summary
math.quat.random creates a new quaternion whose four components are sampled independently from the provided numeric range.
The result is not normalized automatically, so normalize it before using it as a rotation when unit length is required.

## Syntax
```ts
WasmGPU.math.quat.random(min: number, max: number): number[]
const result = wgpu.math.quat.random(min, max);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.quatf.random(out: WasmPtr): void
WasmGPU.math.quatd.random(out: WasmPtr): void
WasmGPU.math.quatf.randomRange(out: WasmPtr, min: number, max: number): void
WasmGPU.math.quatd.randomRange(out: WasmPtr, min: number, max: number): void
```

These forms use caller-owned pointers to 4-element quaternion blocks in WasmGPU driver memory: binary32 for `quatf` and binary64 for `quatd`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `min` | `number` | Yes | Minimum random bound (inclusive lower bound). |
| `max` | `number` | Yes | Maximum random bound (inclusive upper bound); should be >= `min`. |

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

const min = -1.0;
const max = 1.0;
const result = wgpu.math.quat.random(min, max);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [math.quat.init](./math-quat-init.md)
- [math.quat.mul](./math-quat-mul.md)
- [math.quat.normalize](./math-quat-normalize.md)
