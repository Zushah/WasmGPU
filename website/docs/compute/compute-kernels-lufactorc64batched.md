# compute.kernels.luFactorC64Batched

## Summary
compute.kernels.luFactorC64Batched performs in-place batched LU factorization with partial pivoting over row-major complex64 matrices stored as interleaved `[real, imaginary]` `f32` pairs. It overwrites each matrix with compact `L`/`U` factors, writes `u32` pivot rows to `ipiv`, and submits its multi-stage work directly rather than accepting an external encoder.

## Syntax
```ts
WasmGPU.compute.kernels.luFactorC64Batched(matrices: StorageBuffer, ipiv: StorageBuffer, batchCount: number, n: number, opts?: KernelDispatchOptions): void
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `matrices` | `StorageBuffer` | Yes | Row-major complex64 matrices; overwritten with compact L/U factors. |
| `ipiv` | `StorageBuffer` | Yes | Output u32 pivot rows, one per matrix row. |
| `batchCount` | `number` | Yes | Number of matrices; a non-negative integer. |
| `n` | `number` | Yes | Square matrix order; a non-negative integer. |
| `opts` | `KernelDispatchOptions` | No | Label and workgroup-limit validation. External encoders are not supported. |

## Returns
`void` - Factorization and pivot data are written into `matrices` and `ipiv`.

## Type Details
```ts
type KernelDispatchOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
};
```

`matrices` needs `batchCount * n * n * 8` bytes and `ipiv` needs `batchCount * n * 4` bytes. They must be distinct. Zero dimensions perform no work. This multi-stage kernel rejects `opts.encoder` and submits its own commands.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const matrices = wgpu.compute.createStorageBuffer({ data: new Float32Array([4, 0, 3, 0, 6, 0, 3, 0]) });
const ipiv = wgpu.compute.createStorageBuffer({ byteLength: 8, copySrc: true });
wgpu.compute.kernels.luFactorC64Batched(matrices, ipiv, 1, 2);
```

## See Also
- [compute.kernels.luSolveC64Batched](./compute-kernels-lusolvec64batched.md)
- [compute.kernels.luFactorF32Batched](./compute-kernels-lufactorf32batched.md)
- [compute.readback.readF32](./compute-readback-readf32.md)
