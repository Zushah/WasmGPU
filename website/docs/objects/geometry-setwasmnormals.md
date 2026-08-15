# Geometry.setWasmNormals

## Summary

`Geometry.setWasmNormals()` borrows packed three-float normal records from WebAssembly memory.

## Syntax

```ts
Geometry.setWasmNormals(source: WasmMemoryView<Float32Array> | null, options?: GeometryWasmAttributeOptions): void
```

## Notes

Options can identify whether normals are authored. Passing `null` detaches this channel.

## See Also

- [Geometry.normalBuffer](./geometry-normalbuffer.md)
- [Geometry.refreshWasmVertices](./geometry-refreshwasmvertices.md)
