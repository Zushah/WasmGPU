# Compute

The compute subsystem provides WebGPU compute workflows, ndarray abstractions, pipeline helpers, async readback utilities, and built-in kernels for copy, reductions, arg-reductions, scan, histogram, compact, radix sort, scaling, and batched LU factorization and solve.

## In This Section

- Compute pipeline creation and dispatch
- CPU/GPU ndarray lifecycle and residency
- Storage/uniform buffer management
- Built-in compute kernels, including typed vector arithmetic, dot products, GEMM, stable key/value radix sort, and batched LU factorization and solve
- Async readback and result extraction

## Suggested Starting Points

- [WasmGPU.compute](./wasmgpu-compute.md)
- [compute.createPipeline](./compute-createpipeline.md)
- [compute.dispatch](./compute-dispatch.md)
- [compute.createStorageBuffer](./compute-createstoragebuffer.md)
- [compute.kernels.reduceF32](./compute-kernels-reducef32.md)
- [compute.kernels.gemmF32](./compute-kernels-gemmf32.md)
- [compute.kernels.radixSortPairsU32](./compute-kernels-radixsortpairsu32.md)
- [compute.kernels.luFactorF32Batched](./compute-kernels-lufactorf32batched.md)
- [compute.readback.readF32](./compute-readback-readf32.md)
- [compute.CPUndarray.empty](./compute-cpundarray-empty.md)
- [compute.GPUndarray.wrap](./compute-gpundarray-wrap.md)

Use the sidebar to navigate the full compute API surface.
