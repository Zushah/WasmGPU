# WasmGPU.createControls

## Summary
WasmGPU.createControls is the camera-controls factory facade. It creates navigation, orbit, trackball, and fly controllers bound to a camera and canvas element; the returned controller is caller-owned and should be disposed when it is no longer needed.

Canonical documentation namepaths use `createControls.*` for the directly traversable controller factories and `createControls.*#*` for members of a returned controller instance.

## Syntax
```ts
const controls = wgpu.createControls.navigation(camera, canvas);
```

## Available APIs
- [createControls.navigation](./createcontrols-navigation.md) creates the unified navigation controller.
- [createControls.orbit](./createcontrols-orbit.md), [createControls.trackball](./createcontrols-trackball.md), and [createControls.fly](./createcontrols-fly.md) create mode-specific controllers.
- [createControls.navigation#setView](./createcontrols-navigation-setview.md) and [createControls.navigation#fitScene](./createcontrols-navigation-fitscene.md) orient a returned navigation controller.
- [createControls.navigation#dispose](./createcontrols-navigation-dispose.md) releases DOM listeners owned by the controller.

## See Also
- [WasmGPU.createCamera](../world/wasmgpu-createcamera.md)
- [WasmGPU.createOverlay](../world/wasmgpu-createoverlay.md)
