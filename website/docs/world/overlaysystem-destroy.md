# OverlaySystem.destroy

## Summary
OverlaySystem.destroy tears down update scheduling, event subscriptions, and all registered layers, then removes the overlay root element. Call this during app cleanup or when replacing an overlay system entirely.

## Syntax
```ts
OverlaySystem.destroy(): void
overlay.destroy();
```

## Parameters
This method does not take parameters.

## Returns
`void` - No value is returned; overlay resources and DOM nodes are released.

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
overlay.destroy();
```

## See Also
- [OverlaySystem.clearLayers](./overlaysystem-clearlayers.md)
- [OverlaySystem.update](./overlaysystem-update.md)
- [WasmGPU.destroy](../render/wasmgpu-destroy.md)
