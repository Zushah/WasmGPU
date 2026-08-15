# WasmGPU.compute.kernels.luFactorComplex64Batched

## Summary
WasmGPU.compute.kernels.luFactorComplex64Batched is the complex64 counterpart to [WasmGPU.compute.kernels.luFactorF32Batched](./wasmgpu-compute-kernels-lufactorf32batched.md).
It performs in-place batched LU factorization with partial pivoting over row-major complex matrices stored as interleaved real and imaginary `f32` values.
Use this when you want GPU-side factorization for batched complex systems before one or more solve passes.

## Syntax
```ts
WasmGPU.compute.kernels.luFactorComplex64Batched(matrices: StorageBuffer, ipiv: StorageBuffer, batchCount: number, n: number, opts?: KernelDispatchOptions): void
wgpu.compute.kernels.luFactorComplex64Batched(matrices, ipiv, batchCount, n, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `matrices` | `StorageBuffer` | Yes | Row-major `(batchCount, n, n)` complex64 matrix data. This buffer is overwritten in place. |
| `ipiv` | `StorageBuffer` | Yes | Output pivot buffer for `batchCount * n` `u32` indices. |
| `batchCount` | `number` | Yes | Number of matrices in the batch. |
| `n` | `number` | Yes | Matrix dimension for each square system. |
| `opts` | `KernelDispatchOptions` | No | Optional label and workgroup-limit validation settings. `opts.encoder` is currently not supported by this method. |

## Returns
`void` - This method records and submits its own compute work when `batchCount` and `n` are both non-zero.

## Type Details
```ts
type KernelDispatchOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
};
```

`matrices` stores interleaved real and imaginary `f32` values in row-major `(batchCount, n, n)` layout. Each complex64 entry uses 8 bytes, so each matrix occupies `n * n * 8` bytes.

On return, `matrices` contains compact complex64 LU data in the same layout. The strict lower triangle stores `L`, the upper triangle including the diagonal stores `U`, and `L` keeps an implicit unit diagonal. `ipiv` stores 0-based pivot rows for each elimination step.

Requirements:
- `matrices.byteLength >= batchCount * n * n * 8`
- `ipiv.byteLength >= batchCount * n * 4`
- `matrices` and `ipiv` must be distinct `StorageBuffer` instances
- If `batchCount` or `n` is `0`, the method returns without dispatching work

Current limitation:
- `luFactorComplex64Batched()` rejects `opts.encoder` even though other built-in kernels can encode into a caller-provided command encoder

Implementation note:
- The current source uses a small-matrix path for `n < 160` and a blocked factorization path for larger systems. Treat that threshold as an implementation detail, not a stable API contract.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const batchCount = 1;
const n = 2;
const matrices = wgpu.compute.createStorageBuffer({
    data: new Float32Array([
        4.0, 0.0,   1.0, 0.25,
        2.0, -0.5,  3.0, 0.0
    ])
});
const ipiv = wgpu.compute.createStorageBuffer({
    byteLength: batchCount * n * 4
});

wgpu.compute.kernels.luFactorComplex64Batched(matrices, ipiv, batchCount, n);
```

## See Also
- [WasmGPU.compute.kernels.luSolveComplex64Batched](./wasmgpu-compute-kernels-lusolvecomplex64batched.md)
- [WasmGPU.compute.kernels.luFactorF32Batched](./wasmgpu-compute-kernels-lufactorf32batched.md)
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)
- [WasmGPU.compute.readback.readU32](./wasmgpu-compute-readback-readu32.md)
- [WasmGPU.compute.workgroups1D](./wasmgpu-compute-workgroups1d.md)
