# createTransform#worldMatrixPtr

## Summary
createTransform#worldMatrixPtr returns the WebAssembly memory pointer to this transform's world 4x4 matrix.
The matrix contains local TRS composed with all ancestors.
Use this pointer for zero-copy upload paths, custom culling kernels, and interop with external WASM modules.
For up-to-date values, trigger a matrix read through `worldMatrix` before consuming pointer data.

## Syntax
```ts
WasmGPU.createTransform().worldMatrixPtr: WasmPtr
const ptr = transform.worldMatrixPtr;
```

## Parameters
This API does not take parameters.

## Returns
`WasmPtr` - Byte offset in WebAssembly memory for the world matrix.

Treat the matrix as read-only and reacquire both the pointer and its typed view immediately before use. Transform-store capacity growth can relocate the backing arrays, WebAssembly memory growth invalidates existing typed-array views, and `dispose()` releases the slot.

## Type Details
```ts
type WasmPtr = number;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const parent = wgpu.createTransform().setPosition(4, 0, 0);
const child = wgpu.createTransform().setPosition(1, 0, 0).setParent(parent);
void child.worldMatrix;
const world = wgpu.driver.view(Float32Array, child.worldMatrixPtr, 16);

console.log(world[12], world[13], world[14]);
```

## See Also
- [createTransform#worldMatrix](./createtransform-worldmatrix.md)
- [createTransform#localMatrixPtr](./createtransform-localmatrixptr.md)
- [createTransform#worldPosition](./createtransform-worldposition.md)
- [createTransform#setParent](./createtransform-setparent.md)
- [createTransform#positionPtr](./createtransform-positionptr.md)
