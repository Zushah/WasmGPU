# WasmGPU.createControls.navigation().cancelTransition

## Summary
WasmGPU.createControls.navigation().cancelTransition stops any active animated camera transition immediately.
The camera remains at its current interpolated pose when canceled.

## Syntax
```ts
WasmGPU.createControls.navigation().cancelTransition(): this
controls.cancelTransition();
```

## Parameters
This API does not take parameters.

## Returns
`this` - Returns the same controls object.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 50, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas);

controls.setView("left", { animate: true, duration: 1.0 });
setTimeout(() => controls.cancelTransition(), 200);
```

## See Also
- [WasmGPU.createControls.navigation().hasActiveTransition](./wasmgpu-createcontrols-navigation-hasactivetransition.md)
- [WasmGPU.createControls.navigation().setView](./wasmgpu-createcontrols-navigation-setview.md)
