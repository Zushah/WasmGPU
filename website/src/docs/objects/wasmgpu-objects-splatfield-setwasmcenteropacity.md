# SplatField.setWasmCenterOpacity

## Summary

`setWasmCenterOpacity()` borrows packed `[x, y, z, opacity]` records and refreshes them immediately. `refreshWasmCenterOpacity()` re-reads the same source after producer writes or memory growth.

## Syntax

```ts
SplatField.setWasmCenterOpacity(source: WasmMemoryView<Float32Array> | null, options?: SplatFieldWasmChannelOptions): void
SplatField.refreshWasmCenterOpacity(options?: SplatFieldWasmRefreshOptions): void
```

## Notes

Options select `splatCount`, capacity, CPU retention, and bounds recomputation. Passing `null` detaches this channel.

## See Also

- [SplatField.centerOpacityBuffer](./wasmgpu-objects-splatfield-centeropacitybuffer.md)
- [SplatField.refreshFromWasm](./wasmgpu-objects-splatfield-refreshfromwasm.md)
