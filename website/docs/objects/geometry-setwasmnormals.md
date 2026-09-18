# geometry#setWasmNormals

## Summary

`geometry#setWasmNormals()` borrows packed three-float normal records from WebAssembly memory.
A non-null source is refreshed immediately with the other attached vertex channels; after later producer writes or memory growth, call `refreshWasmVertices()` before `upload()`. Passing `null` detaches this channel.

## Syntax

```ts
Geometry.setWasmNormals(source: WasmMemoryView<Float32Array> | null, options?: GeometryWasmAttributeOptions): void
```

## Notes

Options can identify whether normals are authored. Passing `null` detaches this channel.

## See Also

- [geometry#normalBuffer](./geometry-normalbuffer.md)
- [geometry#refreshWasmVertices](./geometry-refreshwasmvertices.md)
