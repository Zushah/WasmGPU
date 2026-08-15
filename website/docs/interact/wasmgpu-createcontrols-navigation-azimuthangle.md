# WasmGPU.createControls.navigation().azimuthAngle

## Summary
WasmGPU.createControls.navigation().azimuthAngle gets or sets the horizontal orbit angle (theta) in radians.
The value is interpreted in the active axis convention frame.

## Syntax
```ts
WasmGPU.createControls.navigation().azimuthAngle: number
controls.azimuthAngle = valueRadians;
const theta = controls.azimuthAngle;
```

## Parameters
This accessor does not take call parameters.

## Returns
`number` - Current azimuth angle in radians.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas, { mode: "orbit" });

controls.azimuthAngle = Math.PI * 0.25;
controls.update(1 / 60);
```

## See Also
- [WasmGPU.createControls.navigation().polarAngle](./wasmgpu-createcontrols-navigation-polarangle.md)
- [WasmGPU.createControls.navigation().setView](./wasmgpu-createcontrols-navigation-setview.md)
