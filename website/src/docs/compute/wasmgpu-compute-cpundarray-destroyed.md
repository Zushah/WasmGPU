# WasmGPU.compute.CPUndarray.destroyed

## Summary
WasmGPU.compute.CPUndarray.destroyed reports whether the ndarray's owned WebAssembly allocations have been released.

## Syntax
```ts
CPUndarray.destroyed: boolean
```

## Returns
`boolean` - `false` until `destroy()` is called and `true` afterward.

## Example
```js
const a = wgpu.compute.CPUndarray.zeros("f32", { shape: [4] });
console.log(a.destroyed); // false
a.destroy();
console.log(a.destroyed); // true
```

## See Also
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
- [WasmGPU.compute.CPUndarray.basePtrBytes](./wasmgpu-compute-cpundarray-baseptrbytes.md)
