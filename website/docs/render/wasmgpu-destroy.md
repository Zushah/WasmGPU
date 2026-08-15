# WasmGPU.destroy

## Summary
WasmGPU.destroy tears down the engine and releases runtime resources.
It stops the frame loop, destroys active PerformanceStats, clears scaling caches, destroys compute resources, and disposes the renderer.
Call this when the canvas/engine is no longer needed.

## Syntax
```ts
WasmGPU.destroy(): void
wgpu.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - Releases owned engine resources.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene([0.03, 0.03, 0.05]);
const camera = wgpu.createCamera.perspective({ fov: Math.PI / 3, aspect: canvas.width / Math.max(1, canvas.height), near: 0.1, far: 1000 });
wgpu.render(scene, camera);
wgpu.destroy();
```

## See Also
- [WasmGPU.stop](./wasmgpu-stop.md)
- [WasmGPU.destroyPerformanceStats](./wasmgpu-destroyperformancestats.md)
- [WasmGPU.create](./wasmgpu-create.md)
