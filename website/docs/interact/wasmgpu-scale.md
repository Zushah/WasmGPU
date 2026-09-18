# WasmGPU.scale

## Summary
WasmGPU.scale is the instance-bound scaling service for computing data statistics and preparing scale transforms used by data-driven materials and scientific scene objects. It uses the engine's compute resources and caches reusable results by source identity.

## Syntax
```ts
const scale = wgpu.scale;
```

## Available APIs
- [scale.createTransform](./scale-createtransform.md) creates a normalized scale-transform descriptor.
- [scale.requestStats](./scale-requeststats.md) computes or retrieves statistics for a scale source.
- [scale.invalidate](./scale-invalidate.md) removes cached results for a source.
- [scale.clearCache](./scale-clearcache.md) clears all cached scaling results.

## See Also
- [WasmGPU.compute](../compute/wasmgpu-compute.md)
- [material.data#scaleTransform](../objects/material-data-scaletransform.md)
- [createPointCloud#scaleTransform](../objects/createpointcloud-scaletransform.md)
