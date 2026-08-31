# WasmGPU.compute.kernels.axpyU32

## Summary
axpyU32 computes `alpha * x + y` element by element using u32 arithmetic.

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
- [WasmGPU.compute.kernels.axpyF32](./wasmgpu-compute-kernels-axpyf32.md)
- [WasmGPU.compute.kernels.axpyC64](./wasmgpu-compute-kernels-axpyc64.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
