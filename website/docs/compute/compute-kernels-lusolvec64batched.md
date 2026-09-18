# compute.kernels.luSolveC64Batched

## Summary
compute.kernels.luSolveC64Batched solves batched complex64 systems from the compact factors and `u32` pivots produced by `luFactorC64Batched`. Right-hand sides and solutions use interleaved `[real, imaginary]` `f32` pairs, with results written into caller-provided `outX`; the multi-stage solve submits its own commands.

## Syntax
```ts
WasmGPU.compute.kernels.luSolveC64Batched(lu: StorageBuffer, ipiv: StorageBuffer, rhs: StorageBuffer, outX: StorageBuffer, batchCount: number, n: number, opts?: KernelDispatchOptions): void
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `lu` | `StorageBuffer` | Yes | Compact complex64 factors from `luFactorC64Batched`. |
| `ipiv` | `StorageBuffer` | Yes | Corresponding u32 pivot rows. |
| `rhs` | `StorageBuffer` | Yes | Interleaved complex64 right-hand-side vectors. |
| `outX` | `StorageBuffer` | Yes | Destination for solved complex64 vectors. |
| `batchCount` | `number` | Yes | Number of systems; a non-negative integer. |
| `n` | `number` | Yes | System order; a non-negative integer. |
| `opts` | `KernelDispatchOptions` | No | Label and workgroup-limit validation. External encoders are not supported. |

## Returns
`void` - Solutions are written into `outX`.

## Type Details
```ts
type KernelDispatchOptions = {
    encoder?: GPUCommandEncoder;
    label?: string;
    validateLimits?: boolean;
};
```

`lu` needs `batchCount * n * n * 8` bytes, `rhs` and `outX` each need `batchCount * n * 8`, and `ipiv` needs `batchCount * n * 4`. All four buffers must be distinct. Zero dimensions perform no work. The method rejects `opts.encoder` and submits its own commands.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const lu = wgpu.compute.createStorageBuffer({
  data: new Float32Array([4, 0, 3, 0, 6, 0, 3, 0]),
});
const ipiv = wgpu.compute.createStorageBuffer({ byteLength: 8 });
const rhs = wgpu.compute.createStorageBuffer({ data: new Float32Array([10, 0, 12, 0]) });
const outX = wgpu.compute.createStorageBuffer({ byteLength: 16, copySrc: true });

wgpu.compute.kernels.luFactorC64Batched(lu, ipiv, 1, 2);
wgpu.compute.kernels.luSolveC64Batched(lu, ipiv, rhs, outX, 1, 2);
console.log(Array.from(await wgpu.compute.readback.readF32(outX)));
```

## See Also
- [compute.kernels.luFactorC64Batched](./compute-kernels-lufactorc64batched.md)
- [compute.kernels.luSolveF32Batched](./compute-kernels-lusolvef32batched.md)
- [compute.readback.readF32](./compute-readback-readf32.md)
