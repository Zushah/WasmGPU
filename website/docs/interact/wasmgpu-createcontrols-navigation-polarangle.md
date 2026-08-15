# WasmGPU.createControls.navigation().polarAngle

## Summary
WasmGPU.createControls.navigation().polarAngle gets or sets the vertical orbit angle (phi) in radians.
Values are typically clamped by `minPolarAngle` and `maxPolarAngle` during update.

## Syntax
```ts
WasmGPU.createControls.navigation().polarAngle: number
controls.polarAngle = valueRadians;
const phi = controls.polarAngle;
```

## Parameters
This accessor does not take call parameters.

## Returns
`number` - Current polar angle in radians.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas, { mode: "orbit", minPolarAngle: 0.1, maxPolarAngle: Math.PI - 0.1 });

controls.polarAngle = Math.PI * 0.4;
controls.update(1 / 60);
```

## See Also
- [WasmGPU.createControls.navigation().azimuthAngle](./wasmgpu-createcontrols-navigation-azimuthangle.md)
- [WasmGPU.createControls.navigation().distance](./wasmgpu-createcontrols-navigation-distance.md)
