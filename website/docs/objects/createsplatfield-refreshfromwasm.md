# createSplatField#refreshFromWasm

## Summary

`createSplatField#refreshFromWasm()` re-reads all attached WebAssembly channels after producer writes or changes to exported view metadata. All active channels must cover one shared `splatCount`; `shDegree` changes the required spherical-harmonic record width.

## Syntax

```ts
SplatField.refreshFromWasm(options?: SplatFieldWasmRefreshOptions): void
```

## Notes

Refresh validates active ranges and marks their GPU data for transfer; `upload()` performs the copy. Options can change active count, copied CPU retention, non-explicit bounds recomputation, or SH degree. Direct color and spherical harmonics remain mutually exclusive.

## See Also

- [createSplatField#setWasmPackedData](./createsplatfield-setwasmpackeddata.md)
- [createSplatField#upload](./createsplatfield-upload.md)
