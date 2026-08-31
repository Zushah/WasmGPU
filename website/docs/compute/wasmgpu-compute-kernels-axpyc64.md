# WasmGPU.compute.kernels.axpyC64

## Summary
axpyC64 computes `alpha * x + y` for interleaved complex64 vectors.

## Syntax
```ts
WasmGPU.compute.kernels.axpyC64(x: StorageBuffer, y: StorageBuffer, alpha: readonly [number, number], opts?: VectorKernelOptions): StorageBuffer
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `StorageBuffer` | Yes | Vector multiplied by `alpha`. |
| `y` | `StorageBuffer` | Yes | Vector added to the scaled `x`. |
| `alpha` | `C64Scalar` | Yes | Complex scalar as `[real, imaginary]`. |
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

type C64Scalar = readonly [number, number];
```

Each complex value is stored as adjacent `[real, imaginary]` f32 components. When `opts.count` is omitted, the input logical lengths must match and that shared length is used. Optional output buffer with at least `count * 8` bytes. The output must be distinct from every input. When `opts.encoder` is supplied, commands are recorded but not submitted by this call.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const x = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 0, 2, -1, 3, 0, 4, 2]) });
const y = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 0, 2, -1, 3, 0, 4, 2]) });
const out = wgpu.compute.kernels.axpyC64(x, y, [0.5, 0]);
const values = await wgpu.compute.readback.readF32(out);
console.log(Array.from(values));
```

## See Also
- [WasmGPU.compute.kernels.axpyF32](./wasmgpu-compute-kernels-axpyf32.md)
- [WasmGPU.compute.kernels.axpyU32](./wasmgpu-compute-kernels-axpyu32.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
