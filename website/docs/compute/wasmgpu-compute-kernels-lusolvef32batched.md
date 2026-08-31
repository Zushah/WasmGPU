# WasmGPU.compute.kernels.luSolveF32Batched

## Summary
WasmGPU.compute.kernels.luSolveF32Batched solves batched linear systems `A x = b` from compact LU factors and pivot rows produced by [WasmGPU.compute.kernels.luFactorF32Batched](./wasmgpu-compute-kernels-lufactorf32batched.md).
It reads factored row-major `f32` matrices plus contiguous `f32` right-hand sides and writes one contiguous `f32` solution vector per batch item.
Use this when you want a practical GPU-side factor-then-solve path for many small or medium square systems.

## Syntax
```ts
WasmGPU.compute.kernels.luSolveF32Batched(lu: StorageBuffer, ipiv: StorageBuffer, rhs: StorageBuffer, outX: StorageBuffer, batchCount: number, n: number, opts?: KernelDispatchOptions): void
wgpu.compute.kernels.luSolveF32Batched(lu, ipiv, rhs, outX, batchCount, n, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `lu` | `StorageBuffer` | Yes | Row-major `(batchCount, n, n)` compact LU data from `luFactorF32Batched()`. |
| `ipiv` | `StorageBuffer` | Yes | Pivot rows for the same batch and matrix size, stored as `(batchCount, n)` `u32`. |
| `rhs` | `StorageBuffer` | Yes | Contiguous `(batchCount, n)` `f32` right-hand-side vectors. |
| `outX` | `StorageBuffer` | Yes | Output buffer for contiguous `(batchCount, n)` `f32` solution vectors. |
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

`lu` is compact row-major LU data in `(batchCount, n, n)` layout. `rhs` and `outX` are contiguous `(batchCount, n)` `f32` arrays, so each vector entry is 4 bytes and each right-hand side or output vector consumes `n * 4` bytes per batch item.

Requirements:
- `lu.byteLength >= batchCount * n * n * 4`
- `rhs.byteLength >= batchCount * n * 4`
- `outX.byteLength >= batchCount * n * 4`
- `ipiv.byteLength >= batchCount * n * 4`
- `lu`, `ipiv`, `rhs`, and `outX` must be pairwise distinct `StorageBuffer` instances
- If `batchCount` or `n` is `0`, the method returns without dispatching work

Current limitation:
- `luSolveF32Batched()` rejects `opts.encoder` even though other built-in kernels can encode into a caller-provided command encoder

Implementation note:
- The current source uses a shared-memory solve path for `n <= 512` and a separate large-matrix path above that. Treat that threshold as an implementation detail, not a stable API contract.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const batchCount = 1;
const n = 2;

const matrices = wgpu.compute.createStorageBuffer({
    data: new Float32Array([
        4, 1,
        2, 3
    ])
});
const ipiv = wgpu.compute.createStorageBuffer({
    byteLength: batchCount * n * 4
});
const rhs = wgpu.compute.createStorageBuffer({
    data: new Float32Array([1, 2])
});
const outX = wgpu.compute.createStorageBuffer({
    byteLength: batchCount * n * 4,
    copySrc: true
});

wgpu.compute.kernels.luFactorF32Batched(matrices, ipiv, batchCount, n);
wgpu.compute.kernels.luSolveF32Batched(matrices, ipiv, rhs, outX, batchCount, n);

const x = await wgpu.compute.readback.readF32(outX, 0, batchCount * n);
console.log(Array.from(x));
```

## See Also
- [WasmGPU.compute.kernels.luFactorF32Batched](./wasmgpu-compute-kernels-lufactorf32batched.md)
- [WasmGPU.compute.kernels.luSolveC64Batched](./wasmgpu-compute-kernels-lusolvec64batched.md)
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
- [WasmGPU.compute.dispatch1D](./wasmgpu-compute-dispatch1d.md)
