# createLatticeSpace#clearWasmSources

## Summary

`createLatticeSpace#clearWasmSources()` detaches the borrowed data and mask views without freeing their WebAssembly allocations. The last uploaded GPU buffers remain usable, but later producer changes are not observed until sources are attached again.

## Syntax

```ts
LatticeSpace.clearWasmSources(): void
```

## Notes

Already uploaded GPU buffers remain available. No later producer changes are observed until sources are attached again.

## See Also

- [createLatticeSpace#refreshFromWasm](./createlatticespace-refreshfromwasm.md)
- [createLatticeSpace#destroy](./createlatticespace-destroy.md)
