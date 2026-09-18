# createOverlay.system#update

## Summary
createOverlay.system#update performs an overlay update pass when state is dirty or forced. Camera and scene values supplied in the request become the system's current persistent view; reasons, `force`, and `nowMs` apply to that call. A `null` camera is stored and makes the method return `false` without clearing pending invalidation reasons.

## Syntax
```ts
OverlaySystem.update(request?: OverlayUpdateRequest): boolean
const updated = overlay.update(request);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `request` | `OverlayUpdateRequest` | No | Optional one-shot camera/scene/reason overrides and force/time controls. |

## Returns
`boolean` - `true` when the system completed an eligible update pass, even if no enabled layers were registered; `false` when there is no camera, no work is pending, or interaction throttling skips the pass.

## Type Details
### OverlayInvalidationReason

```ts
type OverlayInvalidationReason = "manual" | "camera" | "viewport" | "layout" | "scale" | "colormap" | "interaction";
```

### OverlayUpdateRequest

```ts
type OverlayUpdateRequest = {
    camera?: Camera | null;
    scene?: Scene | null;
    reasons?: OverlayInvalidationReason | OverlayInvalidationReason[];
    force?: boolean;
    nowMs?: number;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
const overlay = wgpu.createOverlay.system({ camera, scene, autoUpdate: false });
overlay.addLayer(wgpu.createOverlay.axisTriad());
const updated = overlay.update({ reasons: "manual", force: true });
console.log(updated);
```

## See Also
- [createOverlay.system#invalidate](./createoverlay-system-invalidate.md)
- [createOverlay.system#setView](./createoverlay-system-setview.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
