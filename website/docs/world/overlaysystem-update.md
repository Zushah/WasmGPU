# OverlaySystem.update

## Summary
OverlaySystem.update performs an overlay update pass when state is dirty or forced. It can accept camera/scene overrides and custom reasons for that specific call. The method returns whether an update actually ran.

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
`boolean` - `true` when at least one layer update executed, otherwise `false`.

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
- [OverlaySystem.invalidate](./overlaysystem-invalidate.md)
- [OverlaySystem.setView](./overlaysystem-setview.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
