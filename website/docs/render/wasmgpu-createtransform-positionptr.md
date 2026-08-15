# WasmGPU.createTransform().positionPtr

## Summary
WasmGPU.createTransform().positionPtr returns the WebAssembly memory pointer to this transform's local position vector.
The pointer references three contiguous `f32` values (`x`, `y`, `z`) in the global transform store.
Use this for zero-copy interop when calling WasmGPU memory view APIs or custom WASM routines.
Treat pointer-backed memory as advanced API surface and keep lifetime rules in mind.

## Syntax
```ts
WasmGPU.createTransform().positionPtr: WasmPtr
const ptr = transform.positionPtr;
```

## Parameters
This API does not take parameters.

## Returns
`WasmPtr` - Byte offset into WebAssembly linear memory for local position.

## Type Details
```ts
type WasmPtr = number;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const t = wgpu.createTransform().setPosition(1, 2, 3);
const ptr = t.positionPtr;
const xyz = wgpu.interop.view(Float32Array, ptr, 3);

console.log(ptr, Array.from(xyz));
```

## See Also
- [WasmGPU.createTransform().position](./wasmgpu-createtransform-position.md)
- [WasmGPU.createTransform().setPosition](./wasmgpu-createtransform-setposition.md)
- [WasmGPU.createTransform().rotationPtr](./wasmgpu-createtransform-rotationptr.md)
- [WasmGPU.createTransform().scalePtr](./wasmgpu-createtransform-scaleptr.md)
- [WasmGPU.createTransform().localMatrixPtr](./wasmgpu-createtransform-localmatrixptr.md)
