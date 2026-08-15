# OverlaySystem.clearLayers

## Summary
OverlaySystem.clearLayers detaches and removes all currently registered layers. It is the bulk reset operation for overlay content while keeping the system alive. After clearing, `layerCount` becomes zero.

## Syntax
```ts
OverlaySystem.clearLayers(): OverlaySystem
const result = overlay.clearLayers();
```

## Parameters
This method does not take parameters.

## Returns
`OverlaySystem` - The same overlay system instance with no layers.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

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
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
- [OverlaySystem.removeLayer](./overlaysystem-removelayer.md)
- [OverlaySystem.layerCount](./overlaysystem-layercount.md)
