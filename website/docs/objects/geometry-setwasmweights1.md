# geometry#setWasmWeights1

## Summary

`geometry#setWasmWeights1()` borrows the optional second packed four-float weight set used for eight-influence skinning.
A non-null source is refreshed immediately with the other attached vertex channels; after later producer writes or memory growth, call `refreshWasmVertices()` before `upload()`. Passing `null` detaches this channel.

## Syntax

```ts
Geometry.setWasmWeights1(source: WasmMemoryView<Float32Array> | null, options?: GeometryWasmAttributeOptions): void
```

## See Also

- [geometry#weights1Buffer](./geometry-weights1buffer.md)
- [geometry#setWasmJoints1](./geometry-setwasmjoints1.md)
