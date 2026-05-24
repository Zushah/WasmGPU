# WasmGPU.cullingStats

## Summary
WasmGPU.cullingStats exposes the renderer's nested frustum and occlusion counters from the most recent render frame.
The values update during `WasmGPU.render(...)` or the active render loop.
If the corresponding stats options are disabled, the counters stay at `0`.
Use this for diagnostics, profiling overlays, and quality/performance tuning.

## Syntax
```ts
WasmGPU.cullingStats: {
    frustum: {
        tested: number;
        visible: number;
    };
    occlusion: {
        tested: number;
        visible: number;
        occluded: number;
    };
}
const stats = wgpu.cullingStats;
```

## Parameters
This API does not take parameters.

## Returns
`RendererCullingStats` - Nested frustum and occlusion counters from the latest render frame.

## Type Details
```ts
type RendererCullingStats = {
    frustum: {
        tested: number;
        visible: number;
    };
    occlusion: {
        tested: number;
        visible: number;
        occluded: number;
    };
};
```

#### RendererCullingStats Fields
| Name | Type | Description |
| --- | --- | --- |
| `frustum.tested` | `number` | Number of objects that entered the frustum-culling stage on the latest render frame. Populated only when `frustumCullingStats: true`. |
| `frustum.visible` | `number` | Number of objects kept after frustum culling on the latest render frame. Populated only when `frustumCullingStats: true`. |
| `occlusion.tested` | `number` | Number of objects that entered the render-time occlusion filter. Populated only when both `occlusionCulling: true` and `occlusionCullingStats: true`, and only on frames where a valid previous-frame hierarchy is available. |
| `occlusion.visible` | `number` | Number of tested objects kept after the render-time occlusion filter. |
| `occlusion.occluded` | `number` | Number of tested objects filtered out by the render-time occlusion pass. |

## Notes
- `frustum.*` values stay `0` when `frustumCullingStats` is disabled.
- `occlusion.*` values stay `0` when `occlusionCulling` is disabled, when `occlusionCullingStats` is disabled, or when the renderer does not have a valid previous-frame occlusion hierarchy to apply.
- These counters describe the render path only. They are not pick statistics.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas, {
    frustumCulling: true,
    frustumCullingStats: true,
    occlusionCulling: true,
    occlusionCullingStats: true
});
const scene = wgpu.createScene([0.05, 0.05, 0.08]);
const camera = wgpu.createCamera.perspective({ fov: Math.PI / 3, aspect: canvas.width / Math.max(1, canvas.height), near: 0.1, far: 1000 });
wgpu.render(scene, camera);
console.log(
    wgpu.cullingStats.frustum.visible,
    wgpu.cullingStats.frustum.tested,
    wgpu.cullingStats.occlusion.visible,
    wgpu.cullingStats.occlusion.occluded
);
```

## See Also
- [WasmGPU.create](./wasmgpu-create.md)
- [WasmGPU.render](./wasmgpu-render.md)
- [WasmGPU.warmup](./wasmgpu-warmup.md)
- [WasmGPU.createPerformanceStats](./wasmgpu-createperformancestats.md)
- [WasmGPU.gpu](./wasmgpu-gpu.md)
