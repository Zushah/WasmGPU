# createTransform#scalePtr

## Summary
createTransform#scalePtr returns the WebAssembly memory pointer to this transform's local scale vector.
The pointer references three contiguous `f32` values (`sx`, `sy`, `sz`).
Use this for read-only WASM-level access or external compute interop.
Writing through the pointer bypasses the transform's JavaScript value and dirty tracking; update scale through `setScale()` or `setUniformScale()`.

## Syntax
```ts
WasmGPU.createTransform().scalePtr: WasmPtr
const ptr = transform.scalePtr;
```

## Parameters
This API does not take parameters.

## Returns
`WasmPtr` - Byte offset in WebAssembly memory for local scale components.

Reacquire both the pointer and its typed view immediately before use. Transform-store capacity growth can relocate the backing arrays, WebAssembly memory growth invalidates existing typed-array views, and `dispose()` releases the slot.

## Type Details
```ts
type WasmPtr = number;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const t = wgpu.createTransform().setScale(2, 3, 4);
const scl = wgpu.driver.view(Float32Array, t.scalePtr, 3);

console.log(Array.from(scl));
```

## See Also
- [createTransform#scale](./createtransform-scale.md)
- [createTransform#setScale](./createtransform-setscale.md)
- [createTransform#setUniformScale](./createtransform-setuniformscale.md)
- [createTransform#positionPtr](./createtransform-positionptr.md)
- [createTransform#rotationPtr](./createtransform-rotationptr.md)
