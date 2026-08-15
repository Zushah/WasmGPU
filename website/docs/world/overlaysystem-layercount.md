# OverlaySystem.layerCount

## Summary
OverlaySystem.layerCount returns the number of layers currently registered in the system. Use it for diagnostics or guard logic before updates/removals.

## Syntax
```ts
OverlaySystem.layerCount: number
const count = overlay.layerCount;
```

## Parameters
This property does not take parameters.

## Returns
`number` - Number of attached layers.

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
console.log(overlay.layerCount);
```

## See Also
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
- [OverlaySystem.removeLayer](./overlaysystem-removelayer.md)
- [OverlaySystem.clearLayers](./overlaysystem-clearlayers.md)
