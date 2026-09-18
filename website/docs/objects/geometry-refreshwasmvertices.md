# geometry#refreshWasmVertices

## Summary

`geometry#refreshWasmVertices()` re-reads every attached WebAssembly vertex-attribute view after producer writes or WebAssembly memory growth. It validates their shared active vertex range and marks them for upload.

## Syntax

```ts
Geometry.refreshWasmVertices(options?: GeometryWasmVertexRefreshOptions): void
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options.vertexCount` | `number` | No | Active vertex count. If omitted, attached positions determine it; without positions, the current count is retained. |
| `options.keepCPUData` | `boolean` | No | Retain copies of active records for CPU access. |
| `options.recomputeBounds` | `boolean` | No | Recompute non-explicit bounds from active positions. |

At least one WebAssembly vertex source must be attached. Each attached channel must contain enough complete records for the resolved count. The method does not transfer data to WebGPU; call `upload(device)` when the GPU buffers must be current.

## See Also

- [geometry#setWasmAttributes](./geometry-setwasmattributes.md)
- [geometry#refreshFromWasm](./geometry-refreshfromwasm.md)
- [geometry#upload](./geometry-upload.md)
