# createNodeLink#clearWasmSources

## Summary

`createNodeLink#clearWasmSources()` detaches all borrowed node and edge views without freeing their WebAssembly allocations. It also destroys the NodeLink-managed GPU copies for those Wasm channels. Counts, retained CPU records, external buffers, and explicit bounds remain.

## Syntax

```ts
NodeLink.clearWasmSources(): void
```

## See Also

- [createNodeLink#refreshFromWasm](./createnodelink-refreshfromwasm.md)
- [createNodeLink#destroy](./createnodelink-destroy.md)
