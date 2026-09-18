# createPointCloud#clearWasmSources

## Summary

`createPointCloud#clearWasmSources()` detaches borrowed point and color views without freeing their WebAssembly allocations. It also destroys and clears GPU buffers that the cloud created for those Wasm sources. It does not reset `pointCount`, retained CPU snapshots, or explicit bounds.

## Syntax

```ts
PointCloud.clearWasmSources(): void
pointCloud.clearWasmSources();
```

## Returns

`void`

## See Also

- [createPointCloud#refreshFromWasm](./createpointcloud-refreshfromwasm.md)
- [createPointCloud#destroy](./createpointcloud-destroy.md)
