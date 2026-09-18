# compute.kernels.axpyU32

## Summary
compute.kernels.axpyU32 computes `alpha * x + y` element by element for `u32` vectors, with arithmetic wrapping modulo 2³². The operation can cover a selected prefix, reuse a distinct output buffer, or be recorded into a caller encoder; with no output supplied it returns a new readback-capable storage buffer.

## Syntax
```ts
WasmGPU.compute.kernels.axpyU32(x: StorageBuffer, y: StorageBuffer, alpha: number, opts?: VectorKernelOptions): StorageBuffer
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `StorageBuffer` | Yes | Vector multiplied by `alpha`. |
| `y` | `StorageBuffer` | Yes | Vector added to the scaled `x`. |
| `alpha` | `number` | Yes | Unsigned 32-bit integer scalar. |
| `opts` | `VectorKernelOptions` | No | Element count, reusable output, encoder, label, and workgroup-limit validation. |

## Returns
`StorageBuffer` - Output containing `alpha * x + y` for each selected element. A newly allocated buffer enables `COPY_SRC`; a supplied `opts.out` is returned unchanged by identity.

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
const x = wgpu.compute.createStorageBuffer({ data: new Uint32Array([1, 2, 3, 4]) });
const y = wgpu.compute.createStorageBuffer({ data: new Uint32Array([1, 2, 3, 4]) });
const out = wgpu.compute.kernels.axpyU32(x, y, 2);
const values = await wgpu.compute.readback.readU32(out);
console.log(Array.from(values));
```

## See Also
- [compute.kernels.axpyF32](./compute-kernels-axpyf32.md)
- [compute.kernels.axpyC64](./compute-kernels-axpyc64.md)
- [compute.readback.readU32](./compute-readback-readu32.md)
