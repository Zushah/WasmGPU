# WasmGPU.math.quat.scl

## Summary
WasmGPU.math.quat.scl scales the input by a scalar factor. Use it for uniform amplitude, size, or magnitude scaling.

## Syntax
```ts
WasmGPU.math.quat.scl(q: number[], scalar: number): number[]
const result = wgpu.math.quat.scl(q, scalar);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `q` | `number[]` | Yes | Quaternion input as `[x, y, z, w]`. |
| `scalar` | `number` | Yes | Scalar factor used to uniformly scale components. |

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
const scalar = 0.5;
const result = wgpu.math.quat.scl(q, scalar);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.quat.init](./wasmgpu-math-quat-init.md)
- [WasmGPU.math.quat.mul](./wasmgpu-math-quat-mul.md)
- [WasmGPU.math.quat.normalize](./wasmgpu-math-quat-normalize.md)
