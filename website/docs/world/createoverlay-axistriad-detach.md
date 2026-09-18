# createOverlay.axisTriad#detach

## Summary
createOverlay.axisTriad#detach removes the layer's DOM elements. This is called automatically by `OverlaySystem.removeLayer` and `OverlaySystem.clearLayers`.

## Syntax
```ts
AxisTriadLayer.detach(): void
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
const triad = wgpu.createOverlay.axisTriad({ id: "triad-main" });
overlay.addLayer(triad);
overlay.removeLayer("triad-main");
```

## See Also
- [createOverlay.axisTriad#attach](./createoverlay-axistriad-attach.md)
- [createOverlay.system#removeLayer](./createoverlay-system-removelayer.md)
- [createOverlay.system#clearLayers](./createoverlay-system-clearlayers.md)
