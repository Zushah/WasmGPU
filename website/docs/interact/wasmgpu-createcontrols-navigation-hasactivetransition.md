# WasmGPU.createControls.navigation().hasActiveTransition

## Summary
WasmGPU.createControls.navigation().hasActiveTransition reports whether a camera transition is currently running.
Transitions are created by APIs such as `setView`, `fitScene`, and `fitToBounds` when `animate` is enabled.

## Syntax
```ts
WasmGPU.createControls.navigation().hasActiveTransition: boolean
const active = controls.hasActiveTransition;
```

## Parameters
This accessor does not take parameters.

## Returns
`boolean` - `true` if an animation transition is in progress.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 50, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas);

controls.setView("front", { animate: true, duration: 0.4 });
console.log(controls.hasActiveTransition);
```

## See Also
- [WasmGPU.createControls.navigation().cancelTransition](./wasmgpu-createcontrols-navigation-canceltransition.md)
- [WasmGPU.createControls.navigation().update](./wasmgpu-createcontrols-navigation-update.md)
