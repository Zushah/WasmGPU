# Compute

The compute subsystem provides WebGPU compute workflows, ndarray abstractions, pipeline helpers, async readback utilities, and built-in kernels for copy, reductions, arg-reductions, scan, histogram, compact, radix sort, scaling, and batched LU factorization and solve.

## In This Section

- Compute pipeline creation and dispatch
- CPU/GPU ndarray lifecycle and residency
- Storage/uniform buffer management
- Built-in compute kernels, including typed vector arithmetic, dot products, GEMM, stable key/value radix sort, and batched LU factorization and solve
- Async readback and result extraction

## Suggested Starting Points

- [WasmGPU.compute.createPipeline](./wasmgpu-compute-createpipeline.md)
- [WasmGPU.compute.dispatch](./wasmgpu-compute-dispatch.md)
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)
- [WasmGPU.compute.kernels.luFactorF32Batched](./wasmgpu-compute-kernels-lufactorf32batched.md) and [WasmGPU.compute.kernels.luSolveF32Batched](./wasmgpu-compute-kernels-lusolvef32batched.md)
- [WasmGPU.compute.kernels.addF32](./wasmgpu-compute-kernels-addf32.md), [addU32](./wasmgpu-compute-kernels-addu32.md), and [addC64](./wasmgpu-compute-kernels-addc64.md)
- [WasmGPU.compute.kernels.subF32](./wasmgpu-compute-kernels-subf32.md), [subU32](./wasmgpu-compute-kernels-subu32.md), and [subC64](./wasmgpu-compute-kernels-subc64.md)
- [WasmGPU.compute.kernels.mulF32](./wasmgpu-compute-kernels-mulf32.md), [mulU32](./wasmgpu-compute-kernels-mulu32.md), and [mulC64](./wasmgpu-compute-kernels-mulc64.md)
- [WasmGPU.compute.kernels.sclF32](./wasmgpu-compute-kernels-sclf32.md), [sclU32](./wasmgpu-compute-kernels-sclu32.md), and [sclC64](./wasmgpu-compute-kernels-sclc64.md)
- [WasmGPU.compute.kernels.axpyF32](./wasmgpu-compute-kernels-axpyf32.md), [axpyU32](./wasmgpu-compute-kernels-axpyu32.md), and [axpyC64](./wasmgpu-compute-kernels-axpyc64.md)
- [WasmGPU.compute.kernels.dotF32](./wasmgpu-compute-kernels-dotf32.md), [dotU32](./wasmgpu-compute-kernels-dotu32.md), and [dotC64](./wasmgpu-compute-kernels-dotc64.md)
- [WasmGPU.compute.kernels.gemmF32](./wasmgpu-compute-kernels-gemmf32.md), [gemmU32](./wasmgpu-compute-kernels-gemmu32.md), and [gemmC64](./wasmgpu-compute-kernels-gemmc64.md)
- [WasmGPU.compute.kernels.luFactorC64Batched](./wasmgpu-compute-kernels-lufactorc64batched.md) and [WasmGPU.compute.kernels.luSolveC64Batched](./wasmgpu-compute-kernels-lusolvec64batched.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readback-readf32.md)
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
- [WasmGPU.compute.GPUndarray.wrap](./wasmgpu-compute-gpundarray-wrap.md)

Use the sidebar to navigate the full compute API surface.
