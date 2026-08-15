# WasmGPU.createTransform().worldMatrixPtr

## Summary
WasmGPU.createTransform().worldMatrixPtr returns the WebAssembly memory pointer to this transform's world 4x4 matrix.
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
const world = wgpu.interop.view(Float32Array, child.worldMatrixPtr, 16);

console.log(world[12], world[13], world[14]);
```

## See Also
- [WasmGPU.createTransform().worldMatrix](./wasmgpu-createtransform-worldmatrix.md)
- [WasmGPU.createTransform().localMatrixPtr](./wasmgpu-createtransform-localmatrixptr.md)
- [WasmGPU.createTransform().worldPosition](./wasmgpu-createtransform-worldposition.md)
- [WasmGPU.createTransform().setParent](./wasmgpu-createtransform-setparent.md)
- [WasmGPU.createTransform().positionPtr](./wasmgpu-createtransform-positionptr.md)
