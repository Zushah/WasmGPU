# WasmGPU.run

## Summary
WasmGPU.run starts the engine frame loop and invokes your callback once per animation frame.
Inside the callback, you typically update scene state and issue one render call for the active scene/camera.
The loop also feeds PerformanceStats (if enabled) with per-frame timing data.

## Syntax
```ts
WasmGPU.run(callback: (dt: number, time: number, wgpu: WasmGPU) => void): void
wgpu.run(callback);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(dt: number, time: number, wgpu: WasmGPU) => void` | Yes | Frame callback receiving delta-time seconds, absolute-time seconds, and the active engine instance. |

## Returns
`void` - Starts the RAF loop; no value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene([0.04, 0.05, 0.08]);
const camera = wgpu.createCamera.perspective({ fov: Math.PI / 3, aspect: canvas.width / Math.max(1, canvas.height), near: 0.1, far: 1000 });
camera.position[2] = 4;
wgpu.run((dt, time, engine) => {
    camera.position[0] = Math.sin(time) * 0.5;
    engine.render(scene, camera);
});
```

## See Also
- [WasmGPU.stop](./wasmgpu-stop.md)
- [WasmGPU.render](./wasmgpu-render.md)
- [WasmGPU.isRunning](./wasmgpu-isrunning.md)
- [WasmGPU.destroy](./wasmgpu-destroy.md)
- [WasmGPU.createPerformanceStats](./wasmgpu-createperformancestats.md)
