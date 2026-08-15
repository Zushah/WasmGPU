# LatticeSpace.setData

## Summary

`setData()` installs a CPU array. `setWasmData()` borrows a `WasmMemoryView<Float32Array>`, and `refreshWasmData()` explicitly re-reads that source after producer writes or memory growth.

## Syntax

```ts
LatticeSpace.setData(data: Float32Array, options?: { keepCPUData?: boolean }): void
LatticeSpace.setWasmData(source: WasmMemoryView<Float32Array> | null, options?: LatticeSpaceWasmSourceOptions): void
LatticeSpace.refreshWasmData(options?: LatticeSpaceWasmRefreshOptions): void
```

## Notes

Data length must equal `cellCount * componentCount`. CPU arrays, WebAssembly views, and external GPU buffers are mutually exclusive data source families. WebAssembly capacity is a grow-only managed-GPU allocation hint.

## See Also

- [LatticeSpace.updateData](./latticespace-updatedata.md)
- [LatticeSpace.setDataBuffer](./latticespace-setdatabuffer.md)
- [LatticeSpace.refreshFromWasm](./latticespace-refreshfromwasm.md)
