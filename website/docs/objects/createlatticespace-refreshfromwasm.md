# createLatticeSpace#refreshFromWasm

## Summary

`createLatticeSpace#refreshFromWasm()` re-reads the currently attached cell-data and mask WebAssembly views after producer writes or changes to exported view metadata.

## Syntax

```ts
LatticeSpace.refreshFromWasm(options?: LatticeSpaceWasmRefreshOptions): void
```

## Notes

Each attached view is revalidated against the lattice's fixed dimensions: cell data must contain exactly `cellCount * componentCount` `f32` values, and a mask must contain exactly `cellCount` `u32` values. `keepCPUData` controls whether refreshed active data remains available to CPU record access.

Refresh marks the attached channels for transfer. It does not copy data to WebGPU; call `upload(device, queue)` when the GPU data must be current. With neither WebAssembly source attached, the method has no effect.

## See Also

- [createLatticeSpace#setData](./createlatticespace-setdata.md)
- [createLatticeSpace#setMask](./createlatticespace-setmask.md)
- [createLatticeSpace#clearWasmSources](./createlatticespace-clearwasmsources.md)
