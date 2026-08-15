# WasmGPU.createControls.navigation().axisConvention

## Summary
WasmGPU.createControls.navigation().axisConvention gets or sets the world-axis basis used by view solving and spherical mapping.
Changing this value re-resolves internal orientation state from the current camera.
Use presets (`"y-up-rh"`, `"z-up-rh"`, `"x-up-rh"`) or provide a custom basis.

## Syntax
```ts
WasmGPU.createControls.navigation().axisConvention: AxisConventionDescriptor
controls.axisConvention = axisConventionInput;
const basis = controls.axisConvention;
```

## Parameters
This accessor does not take call parameters.

## Returns
`AxisConventionDescriptor` - Current resolved basis `{ right, up, forward }`.

## Type Details
```ts
type AxisConventionInput =
    | "y-up-rh"
    | "z-up-rh"
    | "x-up-rh"
    | {
        right?: [number, number, number];
        up: [number, number, number];
        forward: [number, number, number];
    };

type AxisConventionDescriptor = {
    right?: [number, number, number];
    up: [number, number, number];
    forward: [number, number, number];
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas);

controls.axisConvention = "z-up-rh";
console.log(controls.axisConvention.up);
```

## See Also
- [WasmGPU.createControls.navigation().setView](./wasmgpu-createcontrols-navigation-setview.md)
- [WasmGPU.createControls.navigation().mode](./wasmgpu-createcontrols-navigation-mode.md)
