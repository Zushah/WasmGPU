# WasmGPU.math.mat4.rotateZ

## Summary
WasmGPU.math.mat4.rotateZ applies rotation around the Z axis by a radian angle. Use it for roll-like rotations in the XY plane.

## Syntax
```ts
WasmGPU.math.mat4.rotateZ(matr: number[], angle: number): number[]
const result = wgpu.math.mat4.rotateZ(matr, angle);
```

## Precision-Specific Wasm Forms
```ts
WasmGPU.math.mat4f.rotateZ(out: WasmPtr, m: WasmPtr, angle: number): void
WasmGPU.math.mat4d.rotateZ(out: WasmPtr, m: WasmPtr, angle: number): void
```

These forms use caller-owned pointers to 16-element matrix blocks in WasmGPU driver memory: binary32 for `mat4f` and binary64 for `mat4d`. Methods with an output pointer write that block instead of allocating a JavaScript array. See [WasmGPU.math](./wasmgpu-math.md) for allocation, views, aliasing, and release requirements.

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `matr` | `number[]` | Yes | Input 4x4 matrix (16 numbers in column-major order) used by this operation. |
| `angle` | `number` | Yes | Rotation angle in radians. |

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

const matr = wgpu.math.mat4.translate(wgpu.math.mat4.identity(), [1, 2, 3]);
const angle = Math.PI / 4;
const result = wgpu.math.mat4.rotateZ(matr, angle);
console.log(result);
```

## See Also
- [WasmGPU.math](./wasmgpu-math.md)
- [WasmGPU.math.mat4.identity](./wasmgpu-math-mat4-identity.md)
- [WasmGPU.math.mat4.mul](./wasmgpu-math-mat4-mul.md)
- [WasmGPU.math.mat4.invert](./wasmgpu-math-mat4-invert.md)
