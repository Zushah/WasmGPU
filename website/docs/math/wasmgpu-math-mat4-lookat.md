# WasmGPU.math.mat4.lookAt

## Summary
WasmGPU.math.mat4.lookAt builds a right-handed view matrix from eye, target, and up vectors. Use it to construct camera transforms for scene rendering.

## Syntax
```ts
WasmGPU.math.mat4.lookAt(eye: number[], center: number[], up: number[]): number[]
const result = wgpu.math.mat4.lookAt(eye, center, up);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.mat4f.lookAt(out: WasmPtr, eye3: WasmPtr, center3: WasmPtr, up3: WasmPtr): void
WasmGPU.math.mat4d.lookAt(out: WasmPtr, eye3: WasmPtr, center3: WasmPtr, up3: WasmPtr): void
```

These forms use caller-owned pointers to 16-element matrix blocks in WasmGPU driver memory: binary32 for `mat4f` and binary64 for `mat4d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `eye` | `number[]` | Yes | Camera position `[x, y, z]` used to build the view matrix. |
| `center` | `number[]` | Yes | Target point `[x, y, z]` that the camera looks at. |
| `up` | `number[]` | Yes | Up direction `[x, y, z]`, typically `[0, 1, 0]`. |

## Returns
`number[]` - New 4x4 matrix as a 16-number column-major array.

## Type Details
```ts
type Mat4 = number[]; // expected length: 16 (4x4, column-major)
type Vec3 = number[]; // expected length: 3 ([x, y, z])
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const eye = [3, 2, 6];
const center = [0, 0, 0];
const up = [0, 1, 0];
const result = wgpu.math.mat4.lookAt(eye, center, up);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.mat4.identity](./wasmgpu-math-mat4-identity.md)
- [WasmGPU.math.mat4.mul](./wasmgpu-math-mat4-mul.md)
- [WasmGPU.math.mat4.invert](./wasmgpu-math-mat4-invert.md)
