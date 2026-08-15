# OverlaySystem.invalidate

## Summary
OverlaySystem.invalidate marks overlay state dirty for a specific reason and schedules an update when auto-update is enabled. Call it after external state changes not automatically tracked by the system. This is a lightweight signal method.

## Syntax
```ts
OverlaySystem.invalidate(reason?: OverlayInvalidationReason): void
overlay.invalidate(reason);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `reason` | `OverlayInvalidationReason` | No | Change category used by layers to decide what to recompute. |

## Returns
`void` - No return value.

## Type Details
### OverlayInvalidationReason

```ts
type OverlayInvalidationReason = "manual" | "camera" | "viewport" | "layout" | "scale" | "colormap" | "interaction";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
overlay.addLayer(wgpu.createOverlay.axisTriad());
overlay.invalidate("manual");
```

## See Also
- [OverlaySystem.update](./overlaysystem-update.md)
- [OverlaySystem.setView](./overlaysystem-setview.md)
- [OverlaySystem.setInteractionActive](./overlaysystem-setinteractionactive.md)
