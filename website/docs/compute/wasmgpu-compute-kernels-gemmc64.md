# WasmGPU.compute.kernels.gemmC64

## Summary
gemmC64 computes row-major `out = alpha * A * B + beta * out` for interleaved complex64 matrices.

## Syntax
```ts
WasmGPU.compute.kernels.gemmC64(a: StorageBuffer, b: StorageBuffer, m: number, n: number, k: number, opts?: GemmC64Options): StorageBuffer
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | `StorageBuffer` | Yes | Row-major complex64 matrix `(m, k)`, interleaved as real/imaginary f32 pairs. |
| `b` | `StorageBuffer` | Yes | Row-major complex64 matrix `(k, n)`. |
| `m` | `number` | Yes | Non-negative output row count. |
| `n` | `number` | Yes | Non-negative output column count. |
| `k` | `number` | Yes | Non-negative shared inner dimension. |
| `opts` | `GemmC64Options` | No | Output, complex scale factors, encoder, label, and validation controls. |

## Returns
`StorageBuffer` - Interleaved complex64 matrix with shape `(m, n)` and `m * n * 8` bytes. A new output enables `COPY_SRC`; `opts.out` is returned when supplied.

## Type Details
```ts
type C64Scalar = readonly [number, number];
type GemmC64Options = {
    out?: StorageBuffer;
    alpha?: C64Scalar; // default: [1, 0]
    beta?: C64Scalar;  // default: [0, 0]
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
};
```

The operation computes `out = alpha * A * B + beta * out`. Each dimension and derived element count must fit in u32. A supplied output needs `m * n * 8` bytes and must differ from both inputs. Each complex matrix element occupies 8 bytes. When `opts.encoder` is supplied, commands are recorded but not submitted by this call.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const a = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 0, 2, 0, 3, 0, 4, 0]) });
const b = wgpu.compute.createStorageBuffer({ data: new Float32Array([5, 0, 6, 0, 7, 0, 8, 0]) });
const out = wgpu.compute.kernels.gemmC64(a, b, 2, 2, 2);
console.log(Array.from(await wgpu.compute.readback.readF32(out)));
```

## See Also
- [WasmGPU.compute.kernels.gemmF32](./wasmgpu-compute-kernels-gemmf32.md)
- [WasmGPU.compute.kernels.gemmU32](./wasmgpu-compute-kernels-gemmu32.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
