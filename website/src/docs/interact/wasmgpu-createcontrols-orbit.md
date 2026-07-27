# WasmGPU.createControls.orbit

## Summary
WasmGPU.createControls.orbit creates `OrbitControls`, a `NavigationControls` specialization that starts in orbit mode.
It is the simplest camera interaction entry point for inspect-and-pan workflows.
Orbit mode keeps a target point and rotates the camera around it.

## Syntax
```ts
WasmGPU.createControls.orbit(camera: Camera, domElement: HTMLCanvasElement, options?: OrbitControlsDescriptor): OrbitControls
const controls = wgpu.createControls.orbit(camera, domElement, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `camera` | `Camera` | Yes | Camera instance controlled in orbit mode. |
| `domElement` | `HTMLCanvasElement` | Yes | Canvas used for pointer and wheel event handling. |
| `options` | `OrbitControlsDescriptor` | No | Orbit limits, damping, speed, axis convention, and mouse mapping options. |

## Returns
`OrbitControls` - Orbit controller instance; call `update(dt)` per frame and `dispose()` when done.

## Type Details
```ts
type OrbitControlsDescriptor = NavigationControlsDescriptor;
```

The factory overrides the descriptor's initial `mode` with `"orbit"`. The returned controller still inherits `setMode()` and can switch to trackball or fly behavior later. See [WasmGPU.createControls.navigation](./wasmgpu-createcontrols-navigation.md) for the complete descriptor.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 45, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 500 });

const controls = wgpu.createControls.orbit(camera, canvas, {
    target: [0, 0, 0],
    rotateSpeed: 0.9,
    panSpeed: 1.1,
    zoomSpeed: 1.0,
    minPolarAngle: 0.05,
    maxPolarAngle: Math.PI - 0.05
});

wgpu.run((dt) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});
```

## See Also
- [WasmGPU.createControls.navigation](./wasmgpu-createcontrols-navigation.md)
- [WasmGPU.createControls.trackball](./wasmgpu-createcontrols-trackball.md)
- [WasmGPU.createControls.navigation().setTarget](./wasmgpu-interact-navigationcontrols-settarget.md)
- [WasmGPU.createControls.navigation().zoom](./wasmgpu-interact-navigationcontrols-zoom.md)
