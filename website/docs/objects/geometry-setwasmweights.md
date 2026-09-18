# geometry#setWasmWeights

## Summary

`geometry#setWasmWeights()` borrows the first packed four-float skin-weight set.
A non-null source is refreshed immediately with the other attached vertex channels; after later producer writes or memory growth, call `refreshWasmVertices()` before `upload()`. Passing `null` detaches this channel.

## Syntax

```ts
Geometry.setWasmWeights(source: WasmMemoryView<Float32Array> | null, options?: GeometryWasmAttributeOptions): void
```

## See Also

- [geometry#weightsBuffer](./geometry-weightsbuffer.md)
- [geometry#setWasmJoints](./geometry-setwasmjoints.md)
