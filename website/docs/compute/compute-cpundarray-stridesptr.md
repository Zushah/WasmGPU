# compute.CPUndarray#stridesPtr

## Summary
compute.CPUndarray#stridesPtr returns the pointer to `ndim` packed byte strides in Wasm memory. Read them as signed 32-bit integers. The pointer is owned by the ndarray and access after `destroy()` throws. JavaScript views made with `wgpu.driver.view(...)` must be rebuilt after WebAssembly memory grows.

## Syntax
```ts
CPUndarray.stridesPtr: WasmPtr
```

## Returns
`WasmPtr` - Pointer to the byte-stride table.

## See Also
- [compute.CPUndarray#shapePtr](./compute-cpundarray-shapeptr.md)
- [compute.CPUndarray#basePtrBytes](./compute-cpundarray-baseptrbytes.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
