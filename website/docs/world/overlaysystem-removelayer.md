# OverlaySystem.removeLayer

## Summary
OverlaySystem.removeLayer detaches and unregisters a layer by ID. Missing IDs are ignored, so repeated removal attempts are safe. The method invalidates overlay state after removal.

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

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

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
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
- [OverlaySystem.clearLayers](./overlaysystem-clearlayers.md)
- [OverlaySystem.layerCount](./overlaysystem-layercount.md)
