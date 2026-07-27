# SplatField.refreshFromWasm

## Summary

`SplatField.refreshFromWasm()` refreshes every currently attached WebAssembly channel after producer writes or memory growth.

## Syntax

```ts
SplatField.refreshFromWasm(options?: SplatFieldWasmRefreshOptions): void
```

## Notes

Refresh updates source views and marks managed GPU data dirty; `upload()` performs the copy. Options can change the active count, CPU retention, bounds recomputation, or SH degree.

## See Also

- [SplatField.setWasmPackedData](./wasmgpu-objects-splatfield-setwasmpackeddata.md)
- [SplatField.upload](./wasmgpu-objects-splatfield-upload.md)
