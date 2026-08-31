# WasmGPU.math.vec3.isNormalized

## Summary
WasmGPU.math.vec3.isNormalized checks whether the input has unit length under the engine tolerance. Use it to validate inputs to rotation-sensitive code.

## Syntax
```ts
WasmGPU.math.vec3.isNormalized(v: number[]): boolean
const result = wgpu.math.vec3.isNormalized(v);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.vec3f.isNormalized(v: WasmPtr): boolean
WasmGPU.math.vec3d.isNormalized(v: WasmPtr): boolean
```

These forms use caller-owned pointers to 3-element vector blocks in WasmGPU driver memory: binary32 for `vec3f` and binary64 for `vec3d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `v` | `number[]` | Yes | Vector input as `[x, y, z]`. |

## Returns
`boolean` - Boolean flag indicating whether the tested condition is satisfied.

## Type Details
```ts
type Vec3 = number[]; // expected length: 3 ([x, y, z])
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const v = [1, 2, 3];
const result = wgpu.math.vec3.isNormalized(v);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.vec3.init](./wasmgpu-math-vec3-init.md)
- [WasmGPU.math.vec3.dot](./wasmgpu-math-vec3-dot.md)
- [WasmGPU.math.vec3.cross](./wasmgpu-math-vec3-cross.md)
