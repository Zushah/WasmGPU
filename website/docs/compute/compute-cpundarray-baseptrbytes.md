# compute.CPUndarray#basePtrBytes

## Summary
compute.CPUndarray#basePtrBytes returns the byte pointer to the ndarray's backing allocation in Wasm memory. Add `offsetBytes` when addressing the first logical element.

The pointer is valid only while the ndarray is alive. If you build a JavaScript view with `wgpu.driver.view(...)`, discard and rebuild that view after WebAssembly memory grows; access after `destroy()` throws.

## Syntax
```ts
CPUndarray.basePtrBytes: WasmPtr
```

## Returns
`WasmPtr` - Unsigned byte offset into WebAssembly memory.

## See Also
- [compute.CPUndarray#shapePtr](./compute-cpundarray-shapeptr.md)
- [compute.CPUndarray#stridesPtr](./compute-cpundarray-stridesptr.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
