# SplatField.setWasmRotation

## Summary

`setWasmRotation()` borrows packed quaternion records and refreshes them immediately. `refreshWasmRotation()` re-reads the same source explicitly.

## Syntax

```ts
SplatField.setWasmRotation(source: WasmMemoryView<Float32Array> | null, options?: SplatFieldWasmChannelOptions): void
SplatField.refreshWasmRotation(options?: SplatFieldWasmRefreshOptions): void
```

## Notes

Records contain four `f32` values per splat. Core center/opacity, rotation, and scale sources must remain available together.

## See Also

- [SplatField.rotationBuffer](./wasmgpu-objects-splatfield-rotationbuffer.md)
- [SplatField.refreshFromWasm](./wasmgpu-objects-splatfield-refreshfromwasm.md)
