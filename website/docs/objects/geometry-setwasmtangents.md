# geometry#setWasmTangents

## Summary

`geometry#setWasmTangents()` borrows packed four-float tangent records from WebAssembly memory.
A non-null source is refreshed immediately with the other attached vertex channels; after later producer writes or memory growth, call `refreshWasmVertices()` before `upload()`. Passing `null` detaches this channel.

## Syntax

```ts
Geometry.setWasmTangents(source: WasmMemoryView<Float32Array> | null, options?: GeometryWasmAttributeOptions): void
```

## See Also

- [geometry#refreshWasmVertices](./geometry-refreshwasmvertices.md)
- [geometry#setWasmAttributes](./geometry-setwasmattributes.md)
