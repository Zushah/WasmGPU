# createOverlay.grid#detach

## Summary
createOverlay.grid#detach removes the grid's DOM nodes. OverlaySystem calls this automatically when layers are removed or cleared.

## Syntax
```ts
GridLayer.detach(): void
layer.detach();
```

## Parameters
This method does not take parameters.

## Returns
`void` - No return value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
const grid = wgpu.createOverlay.grid({ id: "grid-main" });
overlay.addLayer(grid);
overlay.removeLayer("grid-main");
```

## See Also
- [createOverlay.grid#attach](./createoverlay-grid-attach.md)
- [createOverlay.system#removeLayer](./createoverlay-system-removelayer.md)
- [createOverlay.system#clearLayers](./createoverlay-system-clearlayers.md)
