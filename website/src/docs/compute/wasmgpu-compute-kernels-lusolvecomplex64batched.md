# WasmGPU.compute.kernels.luSolveComplex64Batched

## Summary
WasmGPU.compute.kernels.luSolveComplex64Batched solves batched complex linear systems `A x = b` from compact LU factors and pivots produced by [WasmGPU.compute.kernels.luFactorComplex64Batched](./wasmgpu-compute-kernels-lufactorcomplex64batched.md).
It uses interleaved real and imaginary `f32` values for the factored matrices, right-hand sides, and output solutions.
Use this when you need a GPU-side solve path for batched complex64 systems without moving the factorization back to CPU memory.

## Syntax
```ts
WasmGPU.compute.kernels.luSolveComplex64Batched(lu: StorageBuffer, ipiv: StorageBuffer, rhs: StorageBuffer, outX: StorageBuffer, batchCount: number, n: number, opts?: KernelDispatchOptions): void
wgpu.compute.kernels.luSolveComplex64Batched(lu, ipiv, rhs, outX, batchCount, n, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `lu` | `StorageBuffer` | Yes | Row-major `(batchCount, n, n)` compact complex64 LU data from `luFactorComplex64Batched()`. |
| `ipiv` | `StorageBuffer` | Yes | Pivot rows for the same batch and matrix size, stored as `(batchCount, n)` `u32`. |
| `rhs` | `StorageBuffer` | Yes | Contiguous `(batchCount, n)` complex64 right-hand-side vectors. |
| `outX` | `StorageBuffer` | Yes | Output buffer for contiguous `(batchCount, n)` complex64 solution vectors. |
| `batchCount` | `number` | Yes | Number of systems in the batch. |
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

`lu` stores row-major `(batchCount, n, n)` compact complex64 LU data. `rhs` and `outX` are contiguous `(batchCount, n)` complex64 arrays. Each complex64 value is stored as interleaved real and imaginary `f32` components, so each entry uses 8 bytes.

Requirements:
- `lu.byteLength >= batchCount * n * n * 8`
- `rhs.byteLength >= batchCount * n * 8`
- `outX.byteLength >= batchCount * n * 8`
- `ipiv.byteLength >= batchCount * n * 4`
- `lu`, `ipiv`, `rhs`, and `outX` must be pairwise distinct `StorageBuffer` instances
- If `batchCount` or `n` is `0`, the method returns without dispatching work

Current limitation:
- `luSolveComplex64Batched()` rejects `opts.encoder` even though other built-in kernels can encode into a caller-provided command encoder

Implementation note:
- The current source uses a shared-memory solve path for `n <= 512` and a separate large-matrix path above that. Treat that threshold as an implementation detail, not a stable API contract.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const batchCount = 1;
const n = 2;
const lu = wgpu.compute.createStorageBuffer({
    data: new Float32Array([
        1.0, 0.0,  0.0, 0.0,
        0.0, 0.0,  1.0, 0.0
    ])
});
const ipiv = wgpu.compute.createStorageBuffer({
    data: new Uint32Array([0, 1])
});
const rhs = wgpu.compute.createStorageBuffer({
    data: new Float32Array([1.0, 0.0, 2.0, 0.0])
});
const outX = wgpu.compute.createStorageBuffer({
    byteLength: batchCount * n * 8,
    copySrc: true
});

wgpu.compute.kernels.luSolveComplex64Batched(lu, ipiv, rhs, outX, batchCount, n);

const x = await wgpu.compute.readback.readF32(outX, 0, batchCount * n * 2);
console.log(Array.from(x));
```

## See Also
- [WasmGPU.compute.kernels.luFactorComplex64Batched](./wasmgpu-compute-kernels-lufactorcomplex64batched.md)
- [WasmGPU.compute.kernels.luSolveF32Batched](./wasmgpu-compute-kernels-lusolvef32batched.md)
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readbackring-readf32.md)
- [WasmGPU.compute.dispatch1D](./wasmgpu-compute-dispatch1d.md)
