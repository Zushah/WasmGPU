# geometry#setWasmJoints

## Summary

`geometry#setWasmJoints()` borrows the first packed four-`u16` joint-index set.
A non-null source is refreshed immediately with the other attached vertex channels; after later producer writes or memory growth, call `refreshWasmVertices()` before `upload()`. Passing `null` detaches this channel.

## Syntax

```ts
Geometry.setWasmJoints(source: WasmMemoryView<Uint16Array> | null, options?: GeometryWasmAttributeOptions): void
```

## See Also

- [geometry#jointsBuffer](./geometry-jointsbuffer.md)
- [geometry#setWasmWeights](./geometry-setwasmweights.md)
