# WasmGPU.math

## Summary
WasmGPU.math exposes lightweight JavaScript wrappers for matrix, quaternion, and vector operations.
The object contains three namespaces: `mat4`, `quat`, and `vec3`.
These APIs are convenience utilities for CPU-side math in setup and interaction code.

## Syntax
```ts
WasmGPU.math: { mat4: Mat4Ops; quat: QuatOps; vec3: Vec3Ops }
const math = wgpu.math;
```

## Parameters
This accessor does not take parameters.

## Returns
`{ mat4, quat, vec3 }` - Math helper namespaces exposed by WasmGPU.

## Type Details
```ts
type Mat4 = number[]; // expected length: 16 (column-major)
type Quat = number[]; // expected length: 4  ([x, y, z, w])
type Vec3 = number[]; // expected length: 3  ([x, y, z])
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const model = wgpu.math.mat4.translate(wgpu.math.mat4.identity(), [2, 0, -5]);
const q = wgpu.math.quat.fromAxisAngle([0, 1, 0], Math.PI / 3);
const dir = wgpu.math.quat.toRotation(q, [0, 0, -1]);
const n = wgpu.math.vec3.normalize(dir);

console.log(model, q, n);
```

## See Also
- [WasmGPU.math.mat4.identity](./wasmgpu-math-mat4-identity.md)
- [WasmGPU.math.mat4.mul](./wasmgpu-math-mat4-mul.md)
- [WasmGPU.math.quat.slerp](./wasmgpu-math-quat-slerp.md)
- [WasmGPU.math.vec3.normalize](./wasmgpu-math-vec3-normalize.md)
