# geometry#setWasmPositions

## Summary

`geometry#setWasmPositions()` borrows packed position records from WebAssembly memory.
A non-null source is refreshed immediately with the other attached vertex channels; after later producer writes or memory growth, call `refreshWasmVertices()` before `upload()`. Passing `null` detaches this channel.

## Syntax

```ts
Geometry.setWasmPositions(source: WasmMemoryView<Float32Array> | null, options?: GeometryWasmAttributeOptions): void
```

## Notes

Positions use three floats per vertex. The setter refreshes active vertex sources; later producer writes require `refreshWasmVertices()`. Options control vertex count, capacity, CPU retention, and bounds recomputation.

## See Also

- [geometry#positionBuffer](./geometry-positionbuffer.md)
- [geometry#refreshWasmVertices](./geometry-refreshwasmvertices.md)
