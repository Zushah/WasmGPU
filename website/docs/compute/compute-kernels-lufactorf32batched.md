# compute.kernels.luFactorF32Batched

## Summary
compute.kernels.luFactorF32Batched performs in-place batched LU factorization with partial pivoting over row-major `f32` matrices.
It overwrites each input matrix with compact `L` and `U` data and writes pivot rows into a separate `ipiv` buffer.
The multi-stage operation submits its own commands and prepares factors for one or more subsequent batched solves.

## Syntax
```ts
WasmGPU.compute.kernels.luFactorF32Batched(matrices: StorageBuffer, ipiv: StorageBuffer, batchCount: number, n: number, opts?: KernelDispatchOptions): void
wgpu.compute.kernels.luFactorF32Batched(matrices, ipiv, batchCount, n, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `matrices` | `StorageBuffer` | Yes | Row-major `(batchCount, n, n)` `f32` matrix data. This buffer is overwritten in place. |
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

`matrices` stores `f32` values in row-major `(batchCount, n, n)` layout, so each matrix entry is 4 bytes and each matrix occupies `n * n * 4` bytes.

On return, each matrix block contains compact LU data for the pivoted system. The strict lower triangle stores `L`, the upper triangle including the diagonal stores `U`, and the diagonal of `L` is implicit. `ipiv[b * n + k]` is a 0-based row index recording which row was swapped with row `k` at step `k` for batch item `b`.

Requirements:
- `matrices.byteLength >= batchCount * n * n * 4`
- `ipiv.byteLength >= batchCount * n * 4`
- `matrices` and `ipiv` must be distinct `StorageBuffer` instances
- If `batchCount` or `n` is `0`, the method returns without dispatching work

Current limitation:
- `luFactorF32Batched()` rejects `opts.encoder` even though other built-in kernels can encode into a caller-provided command encoder

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const batchCount = 1;
const n = 3;
const matrices = wgpu.compute.createStorageBuffer({
    data: new Float32Array([
        4, 1, 0,
        2, 3, 1,
        0, 1, 2
    ])
});
const ipiv = wgpu.compute.createStorageBuffer({
    byteLength: batchCount * n * 4,
    copySrc: true
});

wgpu.compute.kernels.luFactorF32Batched(matrices, ipiv, batchCount, n);

console.log(Array.from(await wgpu.compute.readback.readU32(ipiv, 0, n)));
```

## See Also
- [compute.kernels.luSolveF32Batched](./compute-kernels-lusolvef32batched.md)
- [compute.kernels.luFactorC64Batched](./compute-kernels-lufactorc64batched.md)
- [compute.createStorageBuffer](./compute-createstoragebuffer.md)
- [compute.readback.readU32](./compute-readback-readu32.md)
- [compute.workgroups1D](./compute-workgroups1d.md)
