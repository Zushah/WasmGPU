# compute.kernels.subF32

## Summary
compute.kernels.subF32 subtracts `f32` vectors element by element. It supports prefix counts, a distinct reusable output, and external command recording; otherwise it returns a new readback-capable storage buffer.

## Syntax
```ts
WasmGPU.compute.kernels.subF32(a: StorageBuffer, b: StorageBuffer, opts?: VectorKernelOptions): StorageBuffer
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | `StorageBuffer` | Yes | Minuend input vector. |
| `b` | `StorageBuffer` | Yes | Subtrahend input vector. |
| `opts` | `VectorKernelOptions` | No | Element count, reusable output, encoder, label, and workgroup-limit validation. |

## Returns
`StorageBuffer` - Output containing `a - b` for each selected element. A newly allocated buffer enables `COPY_SRC`; a supplied `opts.out` is returned unchanged by identity.

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
const out = wgpu.compute.kernels.subF32(a, b);
const values = await wgpu.compute.readback.readF32(out);
console.log(Array.from(values));
```

## See Also
- [compute.kernels.subU32](./compute-kernels-subu32.md)
- [compute.kernels.subC64](./compute-kernels-subc64.md)
- [compute.readback.readF32](./compute-readback-readf32.md)
