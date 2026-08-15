# WasmGPU.createTransform().rotationPtr

## Summary
WasmGPU.createTransform().rotationPtr returns the WebAssembly memory pointer to this transform's local quaternion.
The pointer references four contiguous `f32` values in `[x, y, z, w]` order.
Use this for zero-copy interop with WASM kernels or custom quaternion math pipelines.
This pointer remains valid while the transform is alive and not disposed.

## Syntax
```ts
WasmGPU.createTransform().rotationPtr: WasmPtr
const ptr = transform.rotationPtr;
```

## Parameters
This API does not take parameters.

## Returns
`WasmPtr` - Byte offset into WebAssembly memory for local quaternion values.

## Type Details
```ts
type WasmPtr = number;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const t = wgpu.createTransform().setRotationFromEuler(0.1, 0.2, 0.3);
const quatView = wgpu.interop.view(Float32Array, t.rotationPtr, 4);

console.log(Array.from(quatView));
```

## See Also
- [WasmGPU.createTransform().rotation](./wasmgpu-createtransform-rotation.md)
- [WasmGPU.createTransform().setRotation](./wasmgpu-createtransform-setrotation.md)
- [WasmGPU.createTransform().setRotationFromEuler](./wasmgpu-createtransform-setrotationfromeuler.md)
- [WasmGPU.createTransform().positionPtr](./wasmgpu-createtransform-positionptr.md)
- [WasmGPU.createTransform().scalePtr](./wasmgpu-createtransform-scaleptr.md)
