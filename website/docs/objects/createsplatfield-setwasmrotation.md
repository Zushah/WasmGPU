# createSplatField#setWasmRotation

## Summary

`setWasmRotation()` borrows packed quaternion records and refreshes them immediately. `refreshWasmRotation()` re-reads the same source explicitly.

## Syntax

```ts
SplatField.setWasmRotation(source: WasmMemoryView<Float32Array> | null, options?: SplatFieldWasmChannelOptions): void
SplatField.refreshWasmRotation(options?: SplatFieldWasmRefreshOptions): void
```

## Notes

Records contain quaternion `[x, y, z, w]`. Core center/opacity, rotation, and scale sources must remain available together. Use `setWasmPackedData()` for initial family replacement; passing `null` detaches this channel and destroys its managed GPU copy.

## See Also

- [createSplatField#rotationBuffer](./createsplatfield-rotationbuffer.md)
- [createSplatField#refreshFromWasm](./createsplatfield-refreshfromwasm.md)
