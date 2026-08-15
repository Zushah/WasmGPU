# PerformanceStats.update

## Summary
PerformanceStats.update submits one frame sample to a stats panel instance.
It updates moving averages, graph history, and text output based on configured intervals.
This is called automatically during `WasmGPU.run` when a panel is active, but it is also callable manually.

## Syntax
```ts
PerformanceStats.update(dtSeconds: number, cpuFrameMs?: number): void
stats.update(dtSeconds, cpuFrameMs);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dtSeconds` | `number` | Yes | Frame delta-time in seconds. |
| `cpuFrameMs` | `number` | No | CPU frame cost in milliseconds for load estimation display. |

## Returns
`void` - Updates panel internals and redraws its text/graph as needed.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const stats = wgpu.createPerformanceStats({ showFps: true, showCpuTime: true, graph: true });
stats.update(1 / 60, 4.2);
```

## See Also
- [WasmGPU.createPerformanceStats](./wasmgpu-createperformancestats.md)
- [WasmGPU.performanceStats](./wasmgpu-performancestats.md)
- [PerformanceStats.destroy](./performancestats-destroy.md)
