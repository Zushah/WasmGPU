# WasmGPU.math.quat.init

## Summary
WasmGPU.math.quat.init creates a quaternion from explicit components. It is useful for importing or constructing known quaternion values.

## Syntax
```ts
WasmGPU.math.quat.init(a: number, b: number, c: number, d: number): number[]
const result = wgpu.math.quat.init(a, b, c, d);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | `number` | Yes | X component of the quaternion. |
| `b` | `number` | Yes | Y component of the quaternion. |
| `c` | `number` | Yes | Z component of the quaternion. |
| `d` | `number` | Yes | W component of the quaternion. |

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

const a = 0.0;
const b = 0.7071;
const c = 0.0;
const d = 0.7071;
const result = wgpu.math.quat.init(a, b, c, d);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.quat.mul](./wasmgpu-math-quat-mul.md)
- [WasmGPU.math.quat.normalize](./wasmgpu-math-quat-normalize.md)
- [WasmGPU.math.quat.slerp](./wasmgpu-math-quat-slerp.md)
