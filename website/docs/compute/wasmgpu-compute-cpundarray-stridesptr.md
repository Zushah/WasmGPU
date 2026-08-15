# WasmGPU.compute.CPUndarray.stridesPtr

## Summary
WasmGPU.compute.CPUndarray.stridesPtr returns the pointer to `ndim` packed byte strides in Wasm memory. Read them as signed 32-bit integers. The pointer is owned by the ndarray and access after `destroy()` throws.

## Syntax
```ts
CPUndarray.stridesPtr: WasmPtr
```

## Returns
`WasmPtr` - Pointer to the byte-stride table.

## See Also
- [WasmGPU.compute.CPUndarray.shapePtr](./wasmgpu-compute-cpundarray-shapeptr.md)
- [WasmGPU.compute.CPUndarray.basePtrBytes](./wasmgpu-compute-cpundarray-baseptrbytes.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
