# WasmGPU.python

## Summary
WasmGPU.python transfers C-contiguous Python buffers into WasmGPU CPU and GPU ndarrays.
It accepts a Pyodide-style proxy with `getBuffer()` or a `PyBufferLike` object, validates its dtype, shape, strides, offset, and byte range, and releases buffers acquired from a proxy after every operation.

## Syntax
```ts
WasmGPU.python: PythonInterop
const py = wgpu.python;
```

## Returns
`PythonInterop` - Instance-bound transfer helpers backed by this WasmGPU instance's compute subsystem.

## Type Details
```ts
type PythonInterop = {
    toCPU(src: PythonArraySource): CPUndarray;
    toGPU(src: PythonArraySource, options?: PythonGPUTransferOptions): GPUndarray;
    copyInto(dst: CPUndarray | GPUndarray, src: PythonArraySource): void;
};
```

Supported dtypes are `i8`, `u8`, `i16`, `u16`, `i32`, `u32`, `f32`, and `f64`.
Boolean, `DataView`, `Uint8ClampedArray`, bigint, and non-C-contiguous inputs are rejected.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
const cpu = wgpu.python.toCPU(pythonArray);
const gpu = wgpu.python.toGPU(pythonArray, { label: "positions" });
wgpu.python.copyInto(gpu, updatedPythonArray);
```

## See Also
- [WasmGPU.python.toCPU](./wasmgpu-python-tocpu.md)
- [WasmGPU.python.toGPU](./wasmgpu-python-togpu.md)
- [WasmGPU.python.copyInto](./wasmgpu-python-copyinto.md)
