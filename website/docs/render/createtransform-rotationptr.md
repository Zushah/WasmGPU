# createTransform#rotationPtr

## Summary
createTransform#rotationPtr returns the WebAssembly memory pointer to this transform's local quaternion.
The pointer references four contiguous `f32` values in `[x, y, z, w]` order.
Use this for read-only interop with WASM kernels or custom quaternion math pipelines.
Writing through the pointer bypasses the transform's JavaScript quaternion, normalization, and dirty tracking; update rotation through the transform methods.

## Syntax
```ts
WasmGPU.createTransform().rotationPtr: WasmPtr
const ptr = transform.rotationPtr;
```

## Parameters
This API does not take parameters.

## Returns
`WasmPtr` - Byte offset into WebAssembly memory for local quaternion values.

Reacquire both the pointer and its typed view immediately before use. Transform-store capacity growth can relocate the backing arrays, WebAssembly memory growth invalidates existing typed-array views, and `dispose()` releases the slot.

## Type Details
```ts
type WasmPtr = number;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const t = wgpu.createTransform().setRotationFromEuler(0.1, 0.2, 0.3);
const quatView = wgpu.driver.view(Float32Array, t.rotationPtr, 4);

console.log(Array.from(quatView));
```

## See Also
- [createTransform#rotation](./createtransform-rotation.md)
- [createTransform#setRotation](./createtransform-setrotation.md)
- [createTransform#setRotationFromEuler](./createtransform-setrotationfromeuler.md)
- [createTransform#positionPtr](./createtransform-positionptr.md)
- [createTransform#scalePtr](./createtransform-scaleptr.md)
