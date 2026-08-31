# WasmGPU.math.vec3.isEqual

## Summary
WasmGPU.math.vec3.isEqual checks whether two inputs are equal under the engine's comparison rule. It returns a boolean predicate for fast validation paths.

## Syntax
```ts
WasmGPU.math.vec3.isEqual(v1: number[], v2: number[]): boolean
const result = wgpu.math.vec3.isEqual(v1, v2);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.vec3f.isEqual(a: WasmPtr, b: WasmPtr): boolean
WasmGPU.math.vec3d.isEqual(a: WasmPtr, b: WasmPtr): boolean
```

These forms use caller-owned pointers to 3-element vector blocks in WasmGPU driver memory: binary32 for `vec3f` and binary64 for `vec3d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `v1` | `number[]` | Yes | First vector input as `[x, y, z]`. |
| `v2` | `number[]` | Yes | Second vector input as `[x, y, z]`. |

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

const v1 = [1, -1, 0.5];
const v2 = [0, 1, 0];
const result = wgpu.math.vec3.isEqual(v1, v2);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.vec3.init](./wasmgpu-math-vec3-init.md)
- [WasmGPU.math.vec3.dot](./wasmgpu-math-vec3-dot.md)
- [WasmGPU.math.vec3.cross](./wasmgpu-math-vec3-cross.md)
