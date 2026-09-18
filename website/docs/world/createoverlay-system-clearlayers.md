# createOverlay.system#clearLayers

## Summary
createOverlay.system#clearLayers detaches and removes all currently registered layers. It does not destroy the layer objects, so they may be registered again. It is the bulk reset operation for overlay content while keeping the system alive; afterward, `layerCount` is zero.

## Syntax
```ts
OverlaySystem.clearLayers(): OverlaySystem
const result = overlay.clearLayers();
```

## Parameters
This method does not take parameters.

## Returns
`OverlaySystem` - The same overlay system instance with no layers.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
overlay.addLayer(wgpu.createOverlay.axisTriad());
overlay.addLayer(wgpu.createOverlay.grid());
overlay.clearLayers();
console.log(overlay.layerCount);
```

## See Also
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
- [createOverlay.system#removeLayer](./createoverlay-system-removelayer.md)
- [createOverlay.system#layerCount](./createoverlay-system-layercount.md)
