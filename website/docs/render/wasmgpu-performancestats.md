# WasmGPU.performanceStats

## Summary
WasmGPU.performanceStats returns the currently attached performance panel.
The value is `null` until `WasmGPU.createPerformanceStats` is called (or after it is destroyed).
Use this accessor when you need direct access to the panel instance.

## Syntax
```ts
WasmGPU.performanceStats: PerformanceStats | null
const stats = wgpu.performanceStats;
```

## Parameters
This API does not take parameters.

## Returns
`PerformanceStats | null` - Current stats panel instance, or `null` when no panel is active.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
wgpu.createPerformanceStats({ label: "Runtime", showGpuTime: true, graph: true });
const stats = wgpu.performanceStats;
console.log(stats ? stats.element : null);
```

## See Also
- [WasmGPU.createPerformanceStats](./wasmgpu-createperformancestats.md)
- [WasmGPU.destroyPerformanceStats](./wasmgpu-destroyperformancestats.md)
- [PerformanceStats.update](./performancestats-update.md)
