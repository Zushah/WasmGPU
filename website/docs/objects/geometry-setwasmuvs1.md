# geometry#setWasmUvs1

## Summary

`geometry#setWasmUvs1()` borrows packed two-float secondary UV records from WebAssembly memory.
A non-null source is refreshed immediately with the other attached vertex channels; after later producer writes or memory growth, call `refreshWasmVertices()` before `upload()`. Passing `null` detaches this channel.

## Syntax

```ts
Geometry.setWasmUvs1(source: WasmMemoryView<Float32Array> | null, options?: GeometryWasmAttributeOptions): void
```

## See Also

- [geometry#setWasmUvs](./geometry-setwasmuvs.md)
- [geometry#refreshWasmVertices](./geometry-refreshwasmvertices.md)
