# WasmGPU.createControls.navigation().syncFromCamera

## Summary
WasmGPU.createControls.navigation().syncFromCamera rebuilds internal spherical/trackball state from the camera's current transform.
Use it after directly mutating the camera outside of controls.

## Syntax
```ts
WasmGPU.createControls.navigation().syncFromCamera(): void
controls.syncFromCamera();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1200 });
const controls = wgpu.createControls.navigation(camera, canvas);

camera.transform.setPosition(12, 8, 6);
camera.lookAt([0, 0, 0]);
controls.syncFromCamera();
```

## See Also
- [WasmGPU.createControls.navigation().setCamera](./wasmgpu-createcontrols-navigation-setcamera.md)
- [WasmGPU.createControls.navigation().setTarget](./wasmgpu-createcontrols-navigation-settarget.md)
