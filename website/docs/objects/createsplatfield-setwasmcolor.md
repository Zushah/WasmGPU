# createSplatField#setWasmColor

## Summary

`setWasmColor()` borrows packed RGBA records and refreshes them immediately. `refreshWasmColor()` re-reads the same source explicitly.

## Syntax

```ts
SplatField.setWasmColor(source: WasmMemoryView<Float32Array> | null, options?: SplatFieldWasmChannelOptions): void
SplatField.refreshWasmColor(options?: SplatFieldWasmRefreshOptions): void
```

## Notes

Direct color uses packed RGBA and cannot coexist with an SH source. Decoding follows construction-time `colorSpace`. A usable nonempty WebAssembly-backed field also needs center/opacity, rotation, and scale, so use `setWasmPackedData()` when entering this source family. Passing `null` detaches the color view and removes its field-owned GPU copy.

## See Also

- [createSplatField#colorSpace](./createsplatfield-colorspace.md)
- [createSplatField#setWasmSphericalHarmonics](./createsplatfield-setwasmsphericalharmonics.md)
