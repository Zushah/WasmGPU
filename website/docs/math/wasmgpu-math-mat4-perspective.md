# WasmGPU.math.mat4.perspective

## Summary
WasmGPU.math.mat4.perspective creates a perspective projection matrix from camera frustum parameters. Use it for pinhole-camera rendering in 3D scenes.

## Syntax
```ts
WasmGPU.math.mat4.perspective(fovY: number, aspect: number, near: number, far: number): number[]
const result = wgpu.math.mat4.perspective(fovY, aspect, near, far);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.mat4f.perspective(out: WasmPtr, fovY: number, aspect: number, near: number, far: number): void
WasmGPU.math.mat4d.perspective(out: WasmPtr, fovY: number, aspect: number, near: number, far: number): void
```

These forms use caller-owned pointers to 16-element matrix blocks in WasmGPU driver memory: binary32 for `mat4f` and binary64 for `mat4d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `fovY` | `number` | Yes | Vertical field of view in radians. |
| `aspect` | `number` | Yes | Viewport aspect ratio (`width / height`). |
| `near` | `number` | Yes | Near clipping plane distance; must be positive. |
| `far` | `number` | Yes | Far clipping plane distance; must be greater than `near`. |

## Returns
`number[]` - New 4x4 matrix as a 16-number column-major array.

## Type Details
```ts
type Mat4 = number[]; // expected length: 16 (4x4, column-major)
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const fovY = Math.PI / 3;
const aspect = canvas.width / canvas.height;
const near = 0.1;
const far = 100.0;
const result = wgpu.math.mat4.perspective(fovY, aspect, near, far);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.mat4.identity](./wasmgpu-math-mat4-identity.md)
- [WasmGPU.math.mat4.mul](./wasmgpu-math-mat4-mul.md)
- [WasmGPU.math.mat4.invert](./wasmgpu-math-mat4-invert.md)
