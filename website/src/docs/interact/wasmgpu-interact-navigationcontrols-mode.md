# WasmGPU.createControls.navigation().mode

## Summary
WasmGPU.createControls.navigation().mode exposes the current interaction mode.
Setting this property is equivalent to calling `setMode(...)`.

## Syntax
```ts
WasmGPU.createControls.navigation().mode: NavigationMode
controls.mode = "trackball";
const mode = controls.mode;
```

## Parameters
This accessor does not take call parameters.

## Returns
`NavigationMode` - Current mode (`"orbit"`, `"trackball"`, or `"fly"`).

## Type Details
```ts
type NavigationMode = "orbit" | "trackball" | "fly";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 58, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1200 });
const controls = wgpu.createControls.navigation(camera, canvas, { mode: "orbit" });

controls.mode = "trackball";
console.log(controls.mode);
```

## See Also
- [WasmGPU.createControls.navigation().setMode](./wasmgpu-interact-navigationcontrols-setmode.md)
- [WasmGPU.createControls.orbit](./wasmgpu-createcontrols-orbit.md)
- [WasmGPU.createControls.trackball](./wasmgpu-createcontrols-trackball.md)
- [WasmGPU.createControls.fly](./wasmgpu-createcontrols-fly.md)
