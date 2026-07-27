# SplatField.setWasmColor

## Summary

`setWasmColor()` borrows packed RGBA records and refreshes them immediately. `refreshWasmColor()` re-reads the same source explicitly.

## Syntax

```ts
SplatField.setWasmColor(source: WasmMemoryView<Float32Array> | null, options?: SplatFieldWasmChannelOptions): void
SplatField.refreshWasmColor(options?: SplatFieldWasmRefreshOptions): void
```

## Notes

Direct color and spherical-harmonic sources cannot be active together. Color decoding follows the field's construction-time `colorSpace`.

## See Also

- [SplatField.colorSpace](./wasmgpu-objects-splatfield-colorspace.md)
- [SplatField.setWasmSphericalHarmonics](./wasmgpu-objects-splatfield-setwasmsphericalharmonics.md)
