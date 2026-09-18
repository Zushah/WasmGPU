# createOverlay.legend#attach

## Summary
createOverlay.legend#attach builds and mounts the legend container, gradient canvas, and tick label nodes under the overlay root. This is typically called by `OverlaySystem.addLayer`.

## Syntax
```ts
LegendLayer.attach(root: HTMLDivElement): void
layer.attach(root);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `root` | `HTMLDivElement` | Yes | Overlay root container for legend DOM content. |

## Returns
`void` - No return value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
const legend = wgpu.createOverlay.legend({
    source: { scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" }
});
overlay.addLayer(legend);
```

## See Also
- [createOverlay.legend#detach](./createoverlay-legend-detach.md)
- [createOverlay.legend#update](./createoverlay-legend-update.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
