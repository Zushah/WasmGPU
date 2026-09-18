# geometry#setWasmUvs

## Summary

`geometry#setWasmUvs()` borrows packed two-float primary UV records from WebAssembly memory.
A non-null source is refreshed immediately with the other attached vertex channels; after later producer writes or memory growth, call `refreshWasmVertices()` before `upload()`. Passing `null` detaches this channel.

## Syntax

```ts
Geometry.setWasmUvs(source: WasmMemoryView<Float32Array> | null, options?: GeometryWasmAttributeOptions): void
```

## See Also

- [geometry#uvBuffer](./geometry-uvbuffer.md)
- [geometry#refreshWasmVertices](./geometry-refreshwasmvertices.md)
