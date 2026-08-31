# WasmGPU.math.vec3.print

## Summary
WasmGPU.math.vec3.print prints a formatted representation to the console. Use it for quick debugging of runtime math values.

## Syntax
```ts
WasmGPU.math.vec3.print(v: number[]): void
wgpu.math.vec3.print(v);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.vec3f.print(v: WasmPtr): void
WasmGPU.math.vec3d.print(v: WasmPtr): void
```

These forms use caller-owned pointers to 3-element vector blocks in WasmGPU driver memory: binary32 for `vec3f` and binary64 for `vec3d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `v` | `number[]` | Yes | Vector input as `[x, y, z]`. |

## Returns
`void` - No return value. The formatted value is written to the browser console.

## Type Details
```ts
type Vec3 = number[]; // expected length: 3 ([x, y, z])
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const v = [1, 2, 3];
wgpu.math.vec3.print(v);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.vec3.init](./wasmgpu-math-vec3-init.md)
- [WasmGPU.math.vec3.dot](./wasmgpu-math-vec3-dot.md)
- [WasmGPU.math.vec3.cross](./wasmgpu-math-vec3-cross.md)
