# WasmGPU.math.quat.random

## Summary
WasmGPU.math.quat.random generates a random value within the provided numeric range. Use it to synthesize test data or randomized initialization.

## Syntax
```ts
WasmGPU.math.quat.random(min: number, max: number): number[]
const result = wgpu.math.quat.random(min, max);
```

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
- [WasmGPU.math.quat.init](./wasmgpu-math-quat-init.md)
- [WasmGPU.math.quat.mul](./wasmgpu-math-quat-mul.md)
- [WasmGPU.math.quat.normalize](./wasmgpu-math-quat-normalize.md)
