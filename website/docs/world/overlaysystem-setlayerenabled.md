# OverlaySystem.setLayerEnabled

## Summary
OverlaySystem.setLayerEnabled shows or hides a registered overlay layer.
Unknown IDs and unchanged states are no-ops; changes invalidate the overlay.

## Syntax
```ts
OverlaySystem.setLayerEnabled(id: string, enabled: boolean): this
overlay.setLayerEnabled(id, enabled);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | ID of a layer previously registered with `addLayer`. |
| `enabled` | `boolean` | Yes | `true` to show and update the layer; `false` to hide and skip it. |

## Returns
`this` - The same instance for method chaining.

## Type Details
Disabling a layer sets its wrapper to `display: none` and excludes it from overlay updates. A state change invalidates the overlay with the `"manual"` reason; an unknown ID or an unchanged value does nothing.

## Example
```js
const overlay = wgpu.createOverlay.system({ canvas });
const axes = wgpu.createOverlay.axisTriad({ id: "orientation" });
overlay.addLayer(axes);

overlay.setLayerEnabled("orientation", false);
// Restore the layer later; both calls are chainable.
overlay.setLayerEnabled("orientation", true).invalidate("manual");
```

## See Also
- [WasmGPU.createOverlay.system](./wasmgpu-createoverlay-system.md)
- [OverlaySystem.isLayerEnabled](./overlaysystem-islayerenabled.md)
