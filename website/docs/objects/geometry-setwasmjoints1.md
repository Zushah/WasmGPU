# geometry#setWasmJoints1

## Summary

`geometry#setWasmJoints1()` borrows the optional second packed four-`u16` joint-index set used for eight-influence skinning.
A non-null source is refreshed immediately with the other attached vertex channels; after later producer writes or memory growth, call `refreshWasmVertices()` before `upload()`. Passing `null` detaches this channel.

## Syntax

```ts
Geometry.setWasmJoints1(source: WasmMemoryView<Uint16Array> | null, options?: GeometryWasmAttributeOptions): void
```

## See Also

- [geometry#joints1Buffer](./geometry-joints1buffer.md)
- [geometry#setWasmWeights1](./geometry-setwasmweights1.md)
