# compute.CPUndarray#shapePtr

## Summary
compute.CPUndarray#shapePtr returns the pointer to `ndim` packed `u32` shape values in Wasm memory. The pointer is owned by the ndarray and access after `destroy()` throws. JavaScript views made with `wgpu.driver.view(...)` must be rebuilt after WebAssembly memory grows.

## Syntax
```ts
CPUndarray.shapePtr: WasmPtr
```

## Returns
`WasmPtr` - Pointer to the shape table.

## See Also
- [compute.CPUndarray#stridesPtr](./compute-cpundarray-stridesptr.md)
- [compute.CPUndarray#basePtrBytes](./compute-cpundarray-baseptrbytes.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
