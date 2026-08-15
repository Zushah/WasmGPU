# LatticeSpace.setMask

## Summary

`setMask()` installs a CPU activity mask. `setWasmMask()` borrows a `WasmMemoryView<Uint32Array>`, and `refreshWasmMask()` explicitly re-reads that source.

## Syntax

```ts
LatticeSpace.setMask(mask: Uint32Array, options?: { keepCPUData?: boolean }): void
LatticeSpace.setWasmMask(source: WasmMemoryView<Uint32Array> | null, options?: LatticeSpaceWasmSourceOptions): void
LatticeSpace.refreshWasmMask(options?: LatticeSpaceWasmRefreshOptions): void
```

## Notes

Mask length must equal `cellCount`; zero makes a cell inactive. Passing `null` to `setWasmMask()` removes that source. CPU arrays, WebAssembly views, and external mask buffers are mutually exclusive.

## See Also

- [LatticeSpace.updateMask](./latticespace-updatemask.md)
- [LatticeSpace.setMaskBuffer](./latticespace-setmaskbuffer.md)
- [LatticeSpace.refreshFromWasm](./latticespace-refreshfromwasm.md)
