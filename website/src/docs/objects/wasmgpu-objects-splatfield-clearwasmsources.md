# SplatField.clearWasmSources

## Summary

`SplatField.clearWasmSources()` detaches every borrowed WebAssembly view and releases Wasm-managed GPU buffers owned by the field.

## Syntax

```ts
SplatField.clearWasmSources(): void
```

## Notes

The method never frees the producer's WebAssembly allocation. Use it before switching source families or ending external-memory refreshes.

## See Also

- [SplatField.refreshFromWasm](./wasmgpu-objects-splatfield-refreshfromwasm.md)
- [SplatField.destroy](./wasmgpu-objects-splatfield-destroy.md)
