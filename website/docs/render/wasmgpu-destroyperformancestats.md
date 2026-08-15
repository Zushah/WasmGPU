# WasmGPU.destroyPerformanceStats

## Summary
WasmGPU.destroyPerformanceStats disposes the active performance panel created by `WasmGPU.createPerformanceStats`.
The method also disables renderer GPU timing collection.
Call this when you want to remove diagnostics UI and timing overhead.

## Syntax
```ts
WasmGPU.destroyPerformanceStats(): void
wgpu.destroyPerformanceStats();
```

## Parameters
This API does not take parameters.

## Returns
`void` - Removes/destroys the active stats panel if present.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
wgpu.createPerformanceStats({ showFps: true, showGpuTime: true });
wgpu.destroyPerformanceStats();
console.log(wgpu.performanceStats);
```

## See Also
- [WasmGPU.createPerformanceStats](./wasmgpu-createperformancestats.md)
- [WasmGPU.performanceStats](./wasmgpu-performancestats.md)
- [WasmGPU.destroy](./wasmgpu-destroy.md)
