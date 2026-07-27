# Geometry.setWasmUvs

## Summary

`Geometry.setWasmUvs()` borrows packed two-float primary UV records from WebAssembly memory.

## Syntax

```ts
Geometry.setWasmUvs(source: WasmMemoryView<Float32Array> | null, options?: GeometryWasmAttributeOptions): void
```

## See Also

- [Geometry.uvBuffer](./wasmgpu-objects-geometry-uvbuffer.md)
- [Geometry.refreshWasmVertices](./wasmgpu-objects-geometry-refreshwasmvertices.md)
