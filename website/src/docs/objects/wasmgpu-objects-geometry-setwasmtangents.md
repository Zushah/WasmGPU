# Geometry.setWasmTangents

## Summary

`Geometry.setWasmTangents()` borrows packed four-float tangent records from WebAssembly memory.

## Syntax

```ts
Geometry.setWasmTangents(source: WasmMemoryView<Float32Array> | null, options?: GeometryWasmAttributeOptions): void
```

## See Also

- [Geometry.refreshWasmVertices](./wasmgpu-objects-geometry-refreshwasmvertices.md)
- [Geometry.setWasmAttributes](./wasmgpu-objects-geometry-setwasmattributes.md)
