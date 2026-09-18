# createPerformanceStats#destroy

## Summary
createPerformanceStats#destroy removes the stats panel element from the DOM.
For engine-managed lifecycle, prefer `WasmGPU.destroyPerformanceStats`.
Calling `destroy()` directly does not clear `WasmGPU.performanceStats` or disable GPU timing; an active engine loop can continue updating the detached instance.

## Syntax
```ts
PerformanceStats.destroy(): void
stats.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - Removes the panel DOM node. The JavaScript object remains callable.

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
