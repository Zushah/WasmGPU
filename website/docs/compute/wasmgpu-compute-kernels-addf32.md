# WasmGPU.compute.kernels.addF32

## Summary
addF32 adds two f32 vectors element by element and returns a distinct output buffer.

## Syntax
```ts
WasmGPU.compute.kernels.addF32(a: StorageBuffer, b: StorageBuffer, opts?: VectorKernelOptions): StorageBuffer
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | `StorageBuffer` | Yes | First input vector. |
| `b` | `StorageBuffer` | Yes | Second input vector. |
| `opts` | `VectorKernelOptions` | No | Element count, reusable output, encoder, label, and workgroup-limit validation. |

## Returns
`StorageBuffer` - Output containing `a + b` for each selected element. A newly allocated buffer enables `COPY_SRC`; a supplied `opts.out` is returned unchanged by identity.

## Type Details
```ts
type VectorKernelOptions = {
    count?: number;
    out?: StorageBuffer;
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
};
```

Values use WGSL `f32` arithmetic. When `opts.count` is omitted, the input logical lengths must match and that shared length is used. Optional output buffer with at least `count * 4` bytes. The output must be distinct from every input. When `opts.encoder` is supplied, commands are recorded but not submitted by this call.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const a = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 2, 3, 4]) });
const b = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 2, 3, 4]) });
const out = wgpu.compute.kernels.addF32(a, b);
const values = await wgpu.compute.readback.readF32(out);
console.log(Array.from(values));
```

## See Also
- [WasmGPU.compute.kernels.addU32](./wasmgpu-compute-kernels-addu32.md)
- [WasmGPU.compute.kernels.addC64](./wasmgpu-compute-kernels-addc64.md)
- [WasmGPU.compute.kernels.axpyF32](./wasmgpu-compute-kernels-axpyf32.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
