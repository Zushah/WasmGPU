# Geometry.setWasmPositions

## Summary

`Geometry.setWasmPositions()` borrows packed position records from WebAssembly memory.

## Syntax

```ts
Geometry.setWasmPositions(source: WasmMemoryView<Float32Array> | null, options?: GeometryWasmAttributeOptions): void
```

## Notes

Positions use three floats per vertex. The setter refreshes active vertex sources; later producer writes require `refreshWasmVertices()`. Options control vertex count, capacity, CPU retention, and bounds recomputation.

## See Also

- [Geometry.positionBuffer](./wasmgpu-objects-geometry-positionbuffer.md)
- [Geometry.refreshWasmVertices](./wasmgpu-objects-geometry-refreshwasmvertices.md)
