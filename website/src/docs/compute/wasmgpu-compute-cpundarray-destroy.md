# WasmGPU.compute.CPUndarray.destroy

## Summary
WasmGPU.compute.CPUndarray.destroy deterministically releases the ndarray's WebAssembly backing bytes and its shape, stride, and indexing allocations. The call is idempotent.

After destruction, pointer access, data views, indexing, mutation, zeroing, and GPU upload throw. Previously returned typed-array views must no longer be used because their storage has been returned to the Wasm heap.

## Syntax
```ts
CPUndarray.destroy(): void
a.destroy();
```

## Returns
`void`

## Example
```js
const a = wgpu.compute.CPUndarray.fromArray("f32", [2], [1, 2]);
try {
    console.log(Array.from(a.data()));
} finally {
    a.destroy();
}
```

## See Also
- [WasmGPU.compute.CPUndarray.destroyed](./wasmgpu-compute-cpundarray-destroyed.md)
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.CPUndarray.backingBytes](./wasmgpu-compute-cpundarray-backingbytes.md)
