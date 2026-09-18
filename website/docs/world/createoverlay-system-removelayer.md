# createOverlay.system#removeLayer

## Summary
createOverlay.system#removeLayer detaches and unregisters a layer by ID. Missing IDs are ignored, so repeated removal attempts are safe. Removal does not destroy the layer; built-in layers can be added again later. The method invalidates overlay state after removal.

## Syntax
```ts
OverlaySystem.removeLayer(id: string): OverlaySystem
const result = overlay.removeLayer(id);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Unique layer ID assigned by the layer's `id` property. |

## Returns
`OverlaySystem` - The same overlay system instance.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
const grid = wgpu.createOverlay.grid({ id: "analysis-grid" });
overlay.addLayer(grid);
overlay.removeLayer("analysis-grid");
```

## See Also
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
- [createOverlay.system#clearLayers](./createoverlay-system-clearlayers.md)
- [createOverlay.system#layerCount](./createoverlay-system-layercount.md)
