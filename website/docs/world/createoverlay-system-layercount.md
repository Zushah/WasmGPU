# createOverlay.system#layerCount

## Summary
createOverlay.system#layerCount returns the number of layers currently registered in the system. Use it for diagnostics or guard logic before updates/removals.

## Syntax
```ts
OverlaySystem.layerCount: number
const count = overlay.layerCount;
```

## Parameters
This property does not take parameters.

## Returns
`number` - Number of attached layers.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
overlay.addLayer(wgpu.createOverlay.axisTriad());
console.log(overlay.layerCount);
```

## See Also
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
- [createOverlay.system#removeLayer](./createoverlay-system-removelayer.md)
- [createOverlay.system#clearLayers](./createoverlay-system-clearlayers.md)
