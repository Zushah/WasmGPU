# PerformanceStats.destroy

## Summary
PerformanceStats.destroy removes the stats panel element from the DOM.
After destroy, the instance should be treated as disposed.
For engine-managed lifecycle, prefer `WasmGPU.destroyPerformanceStats`.

## Syntax
```ts
PerformanceStats.destroy(): void
stats.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - Disposes the panel DOM node.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const stats = wgpu.createPerformanceStats({ showFps: true, graph: true });
stats.destroy();
```

## See Also
- [WasmGPU.destroyPerformanceStats](./wasmgpu-destroyperformancestats.md)
- [WasmGPU.createPerformanceStats](./wasmgpu-createperformancestats.md)
- [WasmGPU.performanceStats](./wasmgpu-performancestats.md)
