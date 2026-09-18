# createSplatField#setWasmCenterOpacity

## Summary

`setWasmCenterOpacity()` borrows packed `[x, y, z, opacity]` records and refreshes them immediately. `refreshWasmCenterOpacity()` re-reads the same source after producer writes or memory growth.

## Syntax

```ts
SplatField.setWasmCenterOpacity(source: WasmMemoryView<Float32Array> | null, options?: SplatFieldWasmChannelOptions): void
SplatField.refreshWasmCenterOpacity(options?: SplatFieldWasmRefreshOptions): void
```

## Notes

Options select `splatCount`, grow-only GPU capacity in splat records, CPU retention, and bounds recomputation. Passing `null` detaches this channel and destroys its field-managed GPU copy. Use `setWasmPackedData()` to enter the Wasm source family initially; nonempty Wasm fields require center/opacity, rotation, and scale together.

## See Also

- [createSplatField#centerOpacityBuffer](./createsplatfield-centeropacitybuffer.md)
- [createSplatField#refreshFromWasm](./createsplatfield-refreshfromwasm.md)
