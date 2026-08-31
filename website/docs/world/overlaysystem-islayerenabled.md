# OverlaySystem.isLayerEnabled

## Summary
OverlaySystem.isLayerEnabled reports whether a registered overlay layer is enabled.
Unknown layer IDs return `false`.

## Syntax
```ts
OverlaySystem.isLayerEnabled(id: string): boolean
const enabled = overlay.isLayerEnabled(id);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | ID of a layer previously registered with `addLayer`. |

## Returns
`boolean` - Whether the registered layer is enabled.

## Type Details
Layer IDs come from each layer's public `id` property. This method does not distinguish an unknown ID from a registered but disabled layer; both return `false`.

## Example
```js
const overlay = wgpu.createOverlay.system({ canvas });
const grid = wgpu.createOverlay.grid({ id: "main-grid" });
overlay.addLayer(grid);

console.log(overlay.isLayerEnabled("main-grid")); // true
overlay.setLayerEnabled("main-grid", false);
console.log(overlay.isLayerEnabled("main-grid")); // false
```

## See Also
- [WasmGPU.createOverlay.system](./wasmgpu-createoverlay-system.md)
- [OverlaySystem.setLayerEnabled](./overlaysystem-setlayerenabled.md)
