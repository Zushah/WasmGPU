# createLatticeSpace#setMask

## Summary

`setMask()` copies a CPU activity mask. `setWasmMask()` borrows a `WasmMemoryView<Uint32Array>`, and `refreshWasmMask()` explicitly re-reads that source.

## Syntax

```ts
LatticeSpace.setMask(mask: Uint32Array, options?: { keepCPUData?: boolean }): void
LatticeSpace.setWasmMask(source: WasmMemoryView<Uint32Array> | null, options?: LatticeSpaceWasmSourceOptions): void
LatticeSpace.refreshWasmMask(options?: LatticeSpaceWasmRefreshOptions): void
```

## Notes

Mask length must equal `cellCount`; zero makes a cell inactive. Passing `null` to `setWasmMask()` removes that source. CPU arrays, WebAssembly views, and external mask buffers are mutually exclusive. Unless CPU retention is enabled, `upload()` drops the copied CPU snapshot after transferring it.

## See Also

- [createLatticeSpace#updateMask](./createlatticespace-updatemask.md)
- [createLatticeSpace#setMaskBuffer](./createlatticespace-setmaskbuffer.md)
- [createLatticeSpace#refreshFromWasm](./createlatticespace-refreshfromwasm.md)
