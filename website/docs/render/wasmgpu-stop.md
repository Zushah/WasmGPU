# WasmGPU.stop

## Summary
WasmGPU.stop stops a loop previously started with `WasmGPU.run`.
It cancels the current animation frame request and marks the engine as not running.
Use this when pausing simulation/render updates or before tearing down the engine.

## Syntax
```ts
WasmGPU.stop(): void
wgpu.stop();
```

## Parameters
This API does not take parameters.

## Returns
`void` - Stops the frame loop if it is active.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene([0.03, 0.03, 0.05]);
const camera = wgpu.createCamera.perspective({ fov: Math.PI / 3, aspect: canvas.width / Math.max(1, canvas.height), near: 0.1, far: 1000 });
wgpu.run((dt, time, engine) => {
    engine.render(scene, camera);
});
setTimeout(() => {
    wgpu.stop();
}, 2000);
```

## See Also
- [WasmGPU.run](./wasmgpu-run.md)
- [WasmGPU.isRunning](./wasmgpu-isrunning.md)
- [WasmGPU.destroy](./wasmgpu-destroy.md)
