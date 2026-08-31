# Camera.writeViewMatrixTo

## Summary
Camera.writeViewMatrixTo writes the camera's f32 view matrix directly into the active WasmGPU transform store at a byte pointer.

## Syntax
```ts
Camera.writeViewMatrixTo(outPtr: WasmPtr): void
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `outPtr` | `WasmPtr` | Yes | Byte address of storage for 16 consecutive `f32` matrix elements. |

## Returns
`void`

## Type Details
`WasmPtr` is a byte offset into the active WasmGPU transform store. The pointer must be four-byte aligned and refer to at least 64 writable bytes. The matrix is column-major and transforms world-space coordinates into view space.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective();
camera.setWorldPosition(0, 2, 5).lookAt([0, 0, 0]);

const allocation = wgpu.driver.heap.allocF32(16);
try {
  camera.writeViewMatrixTo(allocation.ptr);
  console.log(allocation.view());
} finally {
  allocation.free();
}
```

## Notes
`outPtr` must identify space for 16 f32 values in the active driver memory. Prefer `writeViewMatrixToArray` unless a workflow already owns compatible WebAssembly memory.

## See Also
- [Camera.writeViewMatrixToArray](./camera-writeviewmatrixtoarray.md)
- [WasmGPU.driver](../interop/wasmgpu-driver.md)
