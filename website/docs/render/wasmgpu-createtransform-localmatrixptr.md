# WasmGPU.createTransform().localMatrixPtr

## Summary
WasmGPU.createTransform().localMatrixPtr returns the WebAssembly memory pointer to this transform's local 4x4 matrix.
The pointer references 16 contiguous `f32` elements in column-major order.
Use this for high-throughput uniform packing, instancing buffers, or direct wasmInterop views.
Accessing the pointer does not automatically force a matrix update; request `localMatrix` first when needed.

## Syntax
```ts
WasmGPU.createTransform().localMatrixPtr: WasmPtr
const ptr = transform.localMatrixPtr;
```

## Parameters
This API does not take parameters.

## Returns
`WasmPtr` - Byte offset in WebAssembly memory for the local matrix data.

## Type Details
```ts
type WasmPtr = number;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const t = wgpu.createTransform().setPosition(1, 0, 0).setScale(2, 2, 2);
void t.localMatrix;
const local = wgpu.interop.view(Float32Array, t.localMatrixPtr, 16);

console.log(local[0], local[5], local[10], local[12]);
```

## See Also
- [WasmGPU.createTransform().localMatrix](./wasmgpu-createtransform-localmatrix.md)
- [WasmGPU.createTransform().worldMatrixPtr](./wasmgpu-createtransform-worldmatrixptr.md)
- [WasmGPU.createTransform().worldMatrix](./wasmgpu-createtransform-worldmatrix.md)
- [WasmGPU.createTransform().positionPtr](./wasmgpu-createtransform-positionptr.md)
- [WasmGPU.createTransform().rotationPtr](./wasmgpu-createtransform-rotationptr.md)
