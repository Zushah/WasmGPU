# compute.kernels.dotF32

## Summary
compute.kernels.dotF32 computes the dot product of two `f32` vectors and writes one `f32` result to a storage buffer. The selected prefix can be limited with `opts.count`, the scalar destination can be reused with `opts.out`, and an external encoder records the work without submitting it.

## Syntax
```ts
WasmGPU.compute.kernels.dotF32(a: StorageBuffer, b: StorageBuffer, opts?: VectorKernelOptions): StorageBuffer
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | `StorageBuffer` | Yes | First input vector. |
| `b` | `StorageBuffer` | Yes | Second input vector. |
| `opts` | `VectorKernelOptions` | No | Element count, reusable output, encoder, label, and workgroup-limit validation. |

## Returns
`StorageBuffer` - Buffer containing the vector dot product as one f32 value. A newly allocated buffer enables `COPY_SRC`; a supplied `opts.out` is returned unchanged by identity.

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

Values use WGSL `f32` arithmetic. When `opts.count` is omitted, the input logical lengths must match and that shared length is used. One-result output buffer (4 bytes). The output must be distinct from every input. When `opts.encoder` is supplied, commands are recorded but not submitted by this call.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const a = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 2, 3, 4]) });
const b = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 2, 3, 4]) });
const out = wgpu.compute.kernels.dotF32(a, b);
const values = await wgpu.compute.readback.readF32(out);
console.log(Array.from(values));
```

## See Also
- [compute.kernels.dotU32](./compute-kernels-dotu32.md)
- [compute.kernels.dotC64](./compute-kernels-dotc64.md)
- [compute.readback.readF32](./compute-readback-readf32.md)
