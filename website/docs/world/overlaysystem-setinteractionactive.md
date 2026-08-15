# OverlaySystem.setInteractionActive

## Summary
OverlaySystem.setInteractionActive sets interaction mode explicitly and triggers invalidation. When turned off, the system can flush a final update after throttled interaction cycles. Use this for custom interaction pipelines.

## Syntax
```ts
OverlaySystem.setInteractionActive(active: boolean): OverlaySystem
const result = overlay.setInteractionActive(active);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `active` | `boolean` | Yes | Interaction state flag (`true` while user manipulates view). |

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
overlay.setInteractionActive(true);
overlay.update();
overlay.setInteractionActive(false);
```

## See Also
- [OverlaySystem.isInteractionActive](./overlaysystem-isinteractionactive.md)
- [OverlaySystem.bindControls](./overlaysystem-bindcontrols.md)
- [OverlaySystem.invalidate](./overlaysystem-invalidate.md)
