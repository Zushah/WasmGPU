# compute.kernels.dotC64

## Summary
compute.kernels.dotC64 computes the unconjugated dot product of complex64 vectors stored as interleaved `[real, imaginary]` `f32` pairs. It writes one complex64 result to a reusable or newly allocated readback-capable storage buffer; `opts.count` selects a prefix and `opts.encoder` records without submitting.

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
- [compute.kernels.dotF32](./compute-kernels-dotf32.md)
- [compute.kernels.dotU32](./compute-kernels-dotu32.md)
- [compute.readback.readF32](./compute-readback-readf32.md)
