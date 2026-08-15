# WasmGPU.createControls.navigation().saveState

## Summary
WasmGPU.createControls.navigation().saveState stores the current camera/target/projection state as the reset baseline.
Later calls to `reset()` return to this saved snapshot.

## Syntax
```ts
WasmGPU.createControls.navigation().saveState(): void
controls.saveState();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas);

controls.setView("right");
controls.saveState();
```

## See Also
- [WasmGPU.createControls.navigation().reset](./wasmgpu-createcontrols-navigation-reset.md)
- [WasmGPU.createControls.navigation().setView](./wasmgpu-createcontrols-navigation-setview.md)
