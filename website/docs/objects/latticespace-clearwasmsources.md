# LatticeSpace.clearWasmSources

## Summary

`LatticeSpace.clearWasmSources()` detaches the borrowed data and mask views without freeing their WebAssembly allocations.

## Syntax

```ts
LatticeSpace.clearWasmSources(): void
```

## Notes

Already uploaded GPU buffers remain available. No later producer changes are observed until sources are attached again.

## See Also

- [LatticeSpace.refreshFromWasm](./latticespace-refreshfromwasm.md)
- [LatticeSpace.destroy](./latticespace-destroy.md)
