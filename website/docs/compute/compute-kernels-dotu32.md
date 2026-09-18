# compute.kernels.dotU32

## Summary
compute.kernels.dotU32 computes the dot product of two `u32` vectors with multiplication and accumulation wrapping modulo 2³². It writes one `u32` result to a reusable or newly allocated readback-capable storage buffer; `opts.count` selects a prefix and `opts.encoder` records without submitting.

## Syntax
```ts
WasmGPU.compute.kernels.dotU32(a: StorageBuffer, b: StorageBuffer, opts?: VectorKernelOptions): StorageBuffer
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | `StorageBuffer` | Yes | First input vector. |
| `b` | `StorageBuffer` | Yes | Second input vector. |
| `opts` | `VectorKernelOptions` | No | Element count, reusable output, encoder, label, and workgroup-limit validation. |

## Returns
`StorageBuffer` - Buffer containing the vector dot product as one u32 value. A newly allocated buffer enables `COPY_SRC`; a supplied `opts.out` is returned unchanged by identity.

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

Values use WGSL `u32` arithmetic; overflow wraps modulo 2³². When `opts.count` is omitted, the input logical lengths must match and that shared length is used. One-result output buffer (4 bytes). The output must be distinct from every input. When `opts.encoder` is supplied, commands are recorded but not submitted by this call.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const a = wgpu.compute.createStorageBuffer({ data: new Uint32Array([1, 2, 3, 4]) });
const b = wgpu.compute.createStorageBuffer({ data: new Uint32Array([1, 2, 3, 4]) });
const out = wgpu.compute.kernels.dotU32(a, b);
const values = await wgpu.compute.readback.readU32(out);
console.log(Array.from(values));
```

## See Also
- [compute.kernels.dotF32](./compute-kernels-dotf32.md)
- [compute.kernels.dotC64](./compute-kernels-dotc64.md)
- [compute.readback.readU32](./compute-readback-readu32.md)
