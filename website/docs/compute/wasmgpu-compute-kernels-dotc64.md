# WasmGPU.compute.kernels.dotC64

## Summary
dotC64 computes an unconjugated complex dot product and returns one interleaved `[real, imaginary]` complex64 value.

## Syntax
```ts
WasmGPU.compute.kernels.dotC64(a: StorageBuffer, b: StorageBuffer, opts?: VectorKernelOptions): StorageBuffer
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | `StorageBuffer` | Yes | First input vector. |
| `b` | `StorageBuffer` | Yes | Second input vector. |
| `opts` | `VectorKernelOptions` | No | Element count, reusable output, encoder, label, and workgroup-limit validation. |

## Returns
`StorageBuffer` - Buffer containing the vector dot product as one complex64 value. A newly allocated buffer enables `COPY_SRC`; a supplied `opts.out` is returned unchanged by identity.

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

Each complex value is stored as adjacent `[real, imaginary]` f32 components. When `opts.count` is omitted, the input logical lengths must match and that shared length is used. One-result output buffer (8 bytes). The output must be distinct from every input. When `opts.encoder` is supplied, commands are recorded but not submitted by this call.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const a = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 0, 2, -1, 3, 0, 4, 2]) });
const b = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 0, 2, -1, 3, 0, 4, 2]) });
const out = wgpu.compute.kernels.dotC64(a, b);
const values = await wgpu.compute.readback.readF32(out);
console.log(Array.from(values));
```

## See Also
- [WasmGPU.compute.kernels.dotF32](./wasmgpu-compute-kernels-dotf32.md)
- [WasmGPU.compute.kernels.dotU32](./wasmgpu-compute-kernels-dotu32.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
