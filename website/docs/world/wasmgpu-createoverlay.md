# WasmGPU.createOverlay

## Summary
WasmGPU.createOverlay is the overlay factory facade. It creates the DOM-backed overlay system and axis-triad, grid, and legend layers that can be attached to it; returned systems and layers are caller-owned.

## Syntax
```ts
const overlay = wgpu.createOverlay.system();
const grid = wgpu.createOverlay.grid();
overlay.addLayer(grid);
```

## Available APIs
- [createOverlay.system](./createoverlay-system.md) creates an overlay system bound to the engine canvas.
- [createOverlay.axisTriad](./createoverlay-axistriad.md), [createOverlay.grid](./createoverlay-grid.md), and [createOverlay.legend](./createoverlay-legend.md) create layers.
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md) attaches a layer.
- [createOverlay.system#destroy](./createoverlay-system-destroy.md) releases system-owned DOM resources and observers.

## See Also
- [WasmGPU.createAnnotation](../interact/wasmgpu-createannotation.md)
- [WasmGPU.createControls](../interact/wasmgpu-createcontrols.md)
- [WasmGPU.createCamera](./wasmgpu-createcamera.md)
