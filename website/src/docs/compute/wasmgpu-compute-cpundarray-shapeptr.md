# WasmGPU.compute.CPUndarray.shapePtr

## Summary
WasmGPU.compute.CPUndarray.shapePtr returns the pointer to `ndim` packed `u32` shape values in Wasm memory. The pointer is owned by the ndarray and access after `destroy()` throws.

## Syntax
```ts
CPUndarray.shapePtr: WasmPtr
```

## Returns
`WasmPtr` - Pointer to the shape table.

## See Also
- [WasmGPU.compute.CPUndarray.stridesPtr](./wasmgpu-compute-cpundarray-stridesptr.md)
- [WasmGPU.compute.CPUndarray.basePtrBytes](./wasmgpu-compute-cpundarray-baseptrbytes.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
