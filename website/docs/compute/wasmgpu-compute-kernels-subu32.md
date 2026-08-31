# WasmGPU.compute.kernels.subU32

## Summary
subU32 computes `a - b` element by element using WebGPU u32 arithmetic.

## Syntax
```ts
WasmGPU.compute.kernels.subU32(a: StorageBuffer, b: StorageBuffer, opts?: VectorKernelOptions): StorageBuffer
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

Values use WGSL `u32` arithmetic; overflow wraps modulo 2³². When `opts.count` is omitted, the input logical lengths must match and that shared length is used. Optional output buffer with at least `count * 4` bytes. The output must be distinct from every input. When `opts.encoder` is supplied, commands are recorded but not submitted by this call.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const a = wgpu.compute.createStorageBuffer({ data: new Uint32Array([1, 2, 3, 4]) });
const b = wgpu.compute.createStorageBuffer({ data: new Uint32Array([1, 2, 3, 4]) });
const out = wgpu.compute.kernels.subU32(a, b);
const values = await wgpu.compute.readback.readU32(out);
console.log(Array.from(values));
```

## See Also
- [WasmGPU.compute.kernels.subF32](./wasmgpu-compute-kernels-subf32.md)
- [WasmGPU.compute.kernels.subC64](./wasmgpu-compute-kernels-subc64.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
