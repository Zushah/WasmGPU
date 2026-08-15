# WasmGPU.createPerformanceStats

## Summary
WasmGPU.createPerformanceStats creates (or replaces) the runtime stats panel bound to the current engine.
The panel can show FPS, frame time, CPU/GPU timing, memory, culling stats, and a rolling graph.
When `showGpuTime` is enabled, renderer GPU timing is enabled so GPU frame durations can be sampled.

## Syntax
```ts
WasmGPU.createPerformanceStats(desc?: PerformanceStatsDescriptor): PerformanceStats
const stats = wgpu.createPerformanceStats(desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `desc` | `PerformanceStatsDescriptor` | No | Optional stats-panel configuration: placement, visibility flags, graph dimensions/history, and update cadence. |

## Returns
`PerformanceStats` - Active stats panel instance attached to the engine.

## Type Details
### PerformanceStatsDescriptor
```ts
type PerformanceStatsDescriptor = {
    parent?: HTMLElement;
    canvas?: HTMLCanvasElement;
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    zIndex?: number;
    paddingPx?: number;
    label?: string;
    graph?: boolean;
    graphWidthPx?: number;
    graphHeightPx?: number;
    historyLength?: number;
    targetFps?: number;
    updateIntervalMs?: number;
    decimals?: number;
    showFps?: boolean;
    showFrameTime?: boolean;
    showCpuTime?: boolean;
    showGpuTime?: boolean;
    showMemory?: boolean;
    showCulling?: boolean;
    pointerEvents?: "none" | "auto";
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const desc = {
    label: "WasmGPU Runtime",
    position: "top-right",
    graph: true,
    showGpuTime: true,
    showCulling: true,
    updateIntervalMs: 200
};
const stats = wgpu.createPerformanceStats(desc);
console.log(stats.element);
```

## See Also
- [WasmGPU.performanceStats](./wasmgpu-performancestats.md)
- [WasmGPU.destroyPerformanceStats](./wasmgpu-destroyperformancestats.md)
- [PerformanceStats.update](./performancestats-update.md)
- [PerformanceStats.destroy](./performancestats-destroy.md)
- [WasmGPU.cullingStats](./wasmgpu-cullingstats.md)
