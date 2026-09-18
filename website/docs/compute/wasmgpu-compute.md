# WasmGPU.compute

## Summary
WasmGPU.compute is the instance-bound WebGPU compute surface. It creates buffers and pipelines, dispatches work, exposes CPU and GPU ndarray constructors, provides reusable readback resources, and owns the built-in compute-kernel library for the `WasmGPU` instance.

Canonical documentation namepaths keep directly traversable services and static members dotted, such as `compute.kernels.*` and `compute.CPUndarray.fromArray`, and use `#` for returned-object members, such as `compute.CPUndarray#data` and `compute.createStorageBuffer#read`.

## Syntax
```ts
const compute = wgpu.compute;
```

`compute` is created with the `WasmGPU` instance and shares its `GPUDevice` and `GPUQueue`. Callers own resources returned by its creation methods; destroying the engine destroys the compute service itself but does not destroy caller-created buffers and pipelines.

## Available APIs
- [compute.createStorageBuffer](./compute-createstoragebuffer.md) and [compute.createUniformBuffer](./compute-createuniformbuffer.md) create GPU buffer wrappers.
- [compute.createPipeline](./compute-createpipeline.md) creates a compute pipeline for caller-authored WGSL.
- [compute.dispatch](./compute-dispatch.md) and related helpers encode or submit compute work.
- [compute.CPUndarray.empty](./compute-cpundarray-empty.md) and [compute.GPUndarray.empty](./compute-gpundarray-empty.md) begin ndarray workflows.
- [compute.kernels.reduceF32](./compute-kernels-reducef32.md) represents the built-in kernel library.
- [compute.readback.readF32](./compute-readback-readf32.md) reads GPU results asynchronously.

## See Also
- [WasmGPU.gpu](../render/wasmgpu-gpu.md)
- [WasmGPU.python](../interop/wasmgpu-python.md)
- [WasmGPU.scale](../interact/wasmgpu-scale.md)
