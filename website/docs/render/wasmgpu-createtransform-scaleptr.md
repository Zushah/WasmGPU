# WasmGPU.createTransform().scalePtr

## Summary
WasmGPU.createTransform().scalePtr returns the WebAssembly memory pointer to this transform's local scale vector.
The pointer references three contiguous `f32` values (`sx`, `sy`, `sz`).
Use this when you need direct WASM-level access for bulk updates or external compute interop.
Like other transform pointers, this is low-level API intended for advanced workflows.

## Syntax
```ts
WasmGPU.createTransform().scalePtr: WasmPtr
const ptr = transform.scalePtr;
```

## Parameters
This API does not take parameters.

## Returns
`WasmPtr` - Byte offset in WebAssembly memory for local scale components.

## Type Details
```ts
type WasmPtr = number;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const t = wgpu.createTransform().setScale(2, 3, 4);
const scl = wgpu.interop.view(Float32Array, t.scalePtr, 3);

console.log(Array.from(scl));
```

## See Also
- [WasmGPU.createTransform().scale](./wasmgpu-createtransform-scale.md)
- [WasmGPU.createTransform().setScale](./wasmgpu-createtransform-setscale.md)
- [WasmGPU.createTransform().setUniformScale](./wasmgpu-createtransform-setuniformscale.md)
- [WasmGPU.createTransform().positionPtr](./wasmgpu-createtransform-positionptr.md)
- [WasmGPU.createTransform().rotationPtr](./wasmgpu-createtransform-rotationptr.md)
