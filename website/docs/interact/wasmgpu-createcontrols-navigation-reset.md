# WasmGPU.createControls.navigation().reset

## Summary
WasmGPU.createControls.navigation().reset restores the camera pose/projection saved by `saveState()`.
Any active transition is canceled before restoring the saved state.

## Syntax
```ts
WasmGPU.createControls.navigation().reset(): void
controls.reset();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 50, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas);

controls.setView("front");
controls.saveState();
controls.setView("top");
controls.reset();
```

## See Also
- [WasmGPU.createControls.navigation().saveState](./wasmgpu-createcontrols-navigation-savestate.md)
- [WasmGPU.createControls.navigation().cancelTransition](./wasmgpu-createcontrols-navigation-canceltransition.md)
