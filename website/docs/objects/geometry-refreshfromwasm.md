# geometry#refreshFromWasm

## Summary

`geometry#refreshFromWasm()` re-reads all attached WebAssembly vertex and index views after producer writes or WebAssembly memory growth. It validates the active ranges, updates optional CPU snapshots and bounds, and marks the refreshed channels for upload.

## Syntax

```ts
Geometry.refreshFromWasm(options?: GeometryWasmVertexRefreshOptions & GeometryWasmIndexRefreshOptions): void
```

## Parameters

```ts
type GeometryWasmVertexRefreshOptions = {
    vertexCount?: number;
    keepCPUData?: boolean;
    recomputeBounds?: boolean;
};

type GeometryWasmIndexRefreshOptions = {
    indexCount?: number;
    keepCPUData?: boolean;
};
```

`vertexCount` and `indexCount` select the active prefixes of their channel families. If `vertexCount` is omitted and positions are attached, the position view's complete records determine the count; otherwise the current vertex count is retained. If `indexCount` is omitted, the attached index view length determines it. Every active channel must contain enough complete records.

`keepCPUData` retains copies of active records for CPU access. `recomputeBounds` updates computed bounds from positions, but does not replace explicit bounds.

The method borrows the attached views and performs no WebGPU transfer. Call `upload(device)` after refreshing when the GPU data must be current. Calling this method with no attached WebAssembly sources has no effect.

## See Also

- [geometry#setWasmAttributes](./geometry-setwasmattributes.md)
- [geometry#refreshWasmVertices](./geometry-refreshwasmvertices.md)
- [geometry#setWasmIndices](./geometry-setwasmindices.md)
- [geometry#upload](./geometry-upload.md)
- [geometry#clearWasmSources](./geometry-clearwasmsources.md)
