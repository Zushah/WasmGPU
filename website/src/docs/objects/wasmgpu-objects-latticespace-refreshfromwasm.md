# LatticeSpace.refreshFromWasm

## Summary

`LatticeSpace.refreshFromWasm()` refreshes both currently attached WebAssembly sources after producer writes or memory growth.

## Syntax

```ts
LatticeSpace.refreshFromWasm(options?: LatticeSpaceWasmRefreshOptions): void
```

## Notes

Refresh marks data for upload and can change CPU retention. It does not copy to GPU until `upload()` runs.

## See Also

- [LatticeSpace.setData](./wasmgpu-objects-latticespace-setdata.md)
- [LatticeSpace.setMask](./wasmgpu-objects-latticespace-setmask.md)
- [LatticeSpace.clearWasmSources](./wasmgpu-objects-latticespace-clearwasmsources.md)
