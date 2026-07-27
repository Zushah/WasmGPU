# Geometry.setWasmUvs1

## Summary

`Geometry.setWasmUvs1()` borrows packed two-float secondary UV records from WebAssembly memory.

## Syntax

```ts
Geometry.setWasmUvs1(source: WasmMemoryView<Float32Array> | null, options?: GeometryWasmAttributeOptions): void
```

## See Also

- [Geometry.setWasmUvs](./wasmgpu-objects-geometry-setwasmuvs.md)
- [Geometry.refreshWasmVertices](./wasmgpu-objects-geometry-refreshwasmvertices.md)
