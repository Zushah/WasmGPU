# WasmGPU.compute.CPUndarray.basePtrBytes

## Summary
WasmGPU.compute.CPUndarray.basePtrBytes returns the byte pointer to the ndarray's backing allocation in Wasm memory. Add `offsetBytes` when addressing the first logical element.

The pointer is valid only while the ndarray is alive and the relevant Wasm memory contract remains valid. Access after `destroy()` throws.

## Syntax
```ts
CPUndarray.basePtrBytes: WasmPtr
```

## Returns
`WasmPtr` - Unsigned byte offset into WebAssembly memory.

## See Also
- [WasmGPU.compute.CPUndarray.shapePtr](./wasmgpu-compute-cpundarray-shapeptr.md)
- [WasmGPU.compute.CPUndarray.stridesPtr](./wasmgpu-compute-cpundarray-stridesptr.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
