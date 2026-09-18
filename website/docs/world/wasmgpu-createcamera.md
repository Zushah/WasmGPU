# WasmGPU.createCamera

## Summary
WasmGPU.createCamera is the camera factory facade. It creates perspective and orthographic cameras; shared camera behavior remains under the `createCamera.*` documentation family, while projection-specific members remain beneath their factory path.

Canonical documentation namepaths use `createCamera.*` for the directly traversable camera factories, `createCamera.*#*` for variant-specific instance members, and `createCamera#*` for members shared by returned camera variants.

## Syntax
```ts
const perspective = wgpu.createCamera.perspective({ fov: 60 });
const orthographic = wgpu.createCamera.orthographic();
```

## Available APIs
- [createCamera.perspective](./createcamera-perspective.md) creates a perspective camera.
- [createCamera.orthographic](./createcamera-orthographic.md) creates an orthographic camera.
- [createCamera#lookAt](./createcamera-lookat.md) and [createCamera#setWorldPosition](./createcamera-setworldposition.md) document shared camera behavior.
- [createCamera.perspective#updateAspect](./createcamera-perspective-updateaspect.md) and [createCamera.orthographic#updateFromCanvas](./createcamera-orthographic-updatefromcanvas.md) update projection-specific state.

## See Also
- [WasmGPU.createControls](../interact/wasmgpu-createcontrols.md)
- [WasmGPU.render](../render/wasmgpu-render.md)
- [WasmGPU.createScene](./wasmgpu-createscene.md)
