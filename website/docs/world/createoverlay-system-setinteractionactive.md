# createOverlay.system#setInteractionActive

## Summary
createOverlay.system#setInteractionActive sets interaction mode explicitly and triggers invalidation. When turned off, the system can flush a final update after throttled interaction cycles. Use this for custom interaction pipelines.

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
- [createOverlay.system#isInteractionActive](./createoverlay-system-isinteractionactive.md)
- [createOverlay.system#bindControls](./createoverlay-system-bindcontrols.md)
- [createOverlay.system#invalidate](./createoverlay-system-invalidate.md)
