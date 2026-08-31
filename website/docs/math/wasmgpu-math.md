# WasmGPU.math

## Summary
WasmGPU.math exposes JavaScript-array convenience math and precision-specific WebAssembly-pointer math.
The legacy `mat4`, `quat`, and `vec3` namespaces accept JavaScript number arrays and allocate arrays for vector-valued results. The `mat4f`, `quatf`, and `vec3f` namespaces operate on binary32 values in Wasm memory; `mat4d`, `quatd`, and `vec3d` provide matching binary64 operations.

## Syntax
```ts
WasmGPU.math: {
    mat4: Mat4Ops;
    mat4f: Mat4FOps;
    mat4d: Mat4DOps;
    quat: QuatOps;
    quatf: QuatFOps;
    quatd: QuatDOps;
    vec3: Vec3Ops;
    vec3f: Vec3FOps;
    vec3d: Vec3DOps;
}
const math = wgpu.math;
```

## Parameters
This accessor does not take parameters.

## Returns
Math helper namespaces for legacy JavaScript arrays and matching f32/f64 pointer operations.

## Type Details
```ts
type Mat4 = number[]; // expected length: 16 (column-major)
type Quat = number[]; // expected length: 4  ([x, y, z, w])
type Vec3 = number[]; // expected length: 3  ([x, y, z])
type WasmPtr = number; // byte address in the WasmGPU driver memory
```

The precision-specific namespaces expose `alloc()` and typed views plus the operations grouped on the existing member pages. `mat4f`/`mat4d` allocate 16 elements, `quatf`/`quatd` allocate 4, and `vec3f`/`vec3d` allocate 3. Their operations do not allocate result arrays: methods with an `out` pointer write caller-owned memory and return `void`, while scalar and predicate methods return the documented JavaScript value. Fixed-width outputs may alias an input.

Release allocations explicitly with the module-level `wasm.freeF32(ptr, count)` or `wasm.freeF64(ptr, count)` helper. Typed views reference WebAssembly memory and should be reacquired after memory growth.

Additional pointer helpers are grouped here because there are no legacy array equivalents:

```ts
WasmGPU.math.mat4f.alloc(): WasmPtr
WasmGPU.math.mat4f.view(ptr: WasmPtr): Float32Array
WasmGPU.math.mat4f.set(ptr: WasmPtr, src: ArrayLike<number>): void
WasmGPU.math.mat4f.decomposeTRS(outTrs: WasmPtr, m: WasmPtr): void
WasmGPU.math.mat4f.mulVec4(outVec4: WasmPtr, m: WasmPtr, v4: WasmPtr): void

WasmGPU.math.mat4d.alloc(): WasmPtr
WasmGPU.math.mat4d.view(ptr: WasmPtr): Float64Array
WasmGPU.math.mat4d.set(ptr: WasmPtr, src: ArrayLike<number>): void
WasmGPU.math.mat4d.decomposeTRS(outTrs: WasmPtr, m: WasmPtr): void
WasmGPU.math.mat4d.mulVec4(outVec4: WasmPtr, m: WasmPtr, v4: WasmPtr): void

WasmGPU.math.quatf.alloc(): WasmPtr
WasmGPU.math.quatf.view(ptr: WasmPtr): Float32Array
WasmGPU.math.quatf.set(ptr: WasmPtr, src: ArrayLike<number>): void
WasmGPU.math.quatd.alloc(): WasmPtr
WasmGPU.math.quatd.view(ptr: WasmPtr): Float64Array
WasmGPU.math.quatd.set(ptr: WasmPtr, src: ArrayLike<number>): void

WasmGPU.math.vec3f.alloc(): WasmPtr
WasmGPU.math.vec3f.view3(ptr: WasmPtr): Float32Array
WasmGPU.math.vec3f.set3(ptr: WasmPtr, src: ArrayLike<number>): void
WasmGPU.math.vec3d.alloc(): WasmPtr
WasmGPU.math.vec3d.view3(ptr: WasmPtr): Float64Array
WasmGPU.math.vec3d.set3(ptr: WasmPtr, src: ArrayLike<number>): void
```

## Example
```js
import { WasmGPU, wasm } from "@zushah/wasmgpu";

const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const model = wgpu.math.mat4.translate(wgpu.math.mat4.identity(), [2, 0, -5]);
const q = wgpu.math.quat.fromAxisAngle([0, 1, 0], Math.PI / 3);
const dir = wgpu.math.quat.toRotation(q, [0, 0, -1]);
const n = wgpu.math.vec3.normalize(dir);

console.log(model, q, n);

const a = wgpu.math.mat4d.alloc();
const b = wgpu.math.mat4d.alloc();
const out = wgpu.math.mat4d.alloc();
try {
    wgpu.math.mat4d.identity(a);
    wgpu.math.mat4d.identity(b);
    wgpu.math.mat4d.add(out, a, b);
    console.log(Array.from(wgpu.math.mat4d.view(out)));
} finally {
    wasm.freeF64(a, 16);
    wasm.freeF64(b, 16);
    wasm.freeF64(out, 16);
}
```

## See Also
- [WasmGPU.math.mat4.identity](./wasmgpu-math-mat4-identity.md)
- [WasmGPU.math.mat4.mul](./wasmgpu-math-mat4-mul.md)
- [WasmGPU.math.quat.slerp](./wasmgpu-math-quat-slerp.md)
- [WasmGPU.math.vec3.normalize](./wasmgpu-math-vec3-normalize.md)
