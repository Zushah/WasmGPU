# createOverlay.system#destroy

## Summary
createOverlay.system#destroy tears down update scheduling and event subscriptions, detaches all registered layers, and removes the overlay root element. It does not destroy layer objects. Call this during app cleanup or when replacing an overlay system entirely.

## Syntax
```ts
OverlaySystem.destroy(): void
overlay.destroy();
```

## Parameters
This method does not take parameters.

## Returns
`void` - No value is returned; overlay resources and DOM nodes are released.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
overlay.addLayer(wgpu.createOverlay.axisTriad());
overlay.destroy();
```

## See Also
- [createOverlay.system#clearLayers](./createoverlay-system-clearlayers.md)
- [createOverlay.system#update](./createoverlay-system-update.md)
- [WasmGPU.destroy](../render/wasmgpu-destroy.md)
