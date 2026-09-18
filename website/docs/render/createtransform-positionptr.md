# createTransform#positionPtr

## Summary
createTransform#positionPtr returns the WebAssembly memory pointer to this transform's local position vector.
The pointer references three contiguous `f32` values (`x`, `y`, `z`) in the global transform store.
Use this for read-only interop with WasmGPU memory views or custom WASM routines.
Writing through the pointer bypasses the transform's JavaScript value and dirty tracking; update position through `setPosition()` or `translate()`.

## Syntax
```ts
WasmGPU.createTransform().positionPtr: WasmPtr
const ptr = transform.positionPtr;
```

## Parameters
This API does not take parameters.

## Returns
`WasmPtr` - Byte offset into WebAssembly linear memory for local position.

Reacquire both the pointer and its typed view immediately before use. Transform-store capacity growth can relocate the backing arrays, WebAssembly memory growth invalidates existing typed-array views, and `dispose()` releases the slot.

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
const xyz = wgpu.driver.view(Float32Array, ptr, 3);

console.log(ptr, Array.from(xyz));
```

## See Also
- [createTransform#position](./createtransform-position.md)
- [createTransform#setPosition](./createtransform-setposition.md)
- [createTransform#rotationPtr](./createtransform-rotationptr.md)
- [createTransform#scalePtr](./createtransform-scaleptr.md)
- [createTransform#localMatrixPtr](./createtransform-localmatrixptr.md)
