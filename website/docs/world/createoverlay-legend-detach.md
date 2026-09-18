# createOverlay.legend#detach

## Summary
createOverlay.legend#detach removes legend DOM nodes and unsubscribes from bound source visual-change signals. OverlaySystem calls this automatically during removal/clear operations.

## Syntax
```ts
LegendLayer.detach(): void
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
const legend = wgpu.createOverlay.legend({
    id: "legend-main",
    source: { scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "turbo" }
});
overlay.addLayer(legend);
overlay.removeLayer("legend-main");
```

## See Also
- [createOverlay.legend#attach](./createoverlay-legend-attach.md)
- [createOverlay.system#removeLayer](./createoverlay-system-removelayer.md)
- [createOverlay.system#clearLayers](./createoverlay-system-clearlayers.md)
