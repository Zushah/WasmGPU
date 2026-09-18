# createOverlay.grid#update

## Summary
createOverlay.grid#update recomputes projected grid lines, major/minor spacing, and labels for current camera/scene state. In `scene-fit` mode it uses visible scene bounds plus a 10% margin; a missing scene or empty bounds falls back to `[-10, 10]` on both grid axes. In `fixed` mode it uses the configured limits. OverlaySystem invokes this during update passes.

## Syntax
```ts
GridLayer.update(ctx: OverlayUpdateContext): void
layer.update(ctx);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `ctx` | `OverlayUpdateContext` | Yes | Overlay frame context carrying camera, scene, viewport, and reason set. |

## Returns
`void` - No return value.

## Type Details
### OverlayUpdateContext

```ts
type OverlayUpdateContext = {
    camera: Camera;
    scene: Scene | null;
    width: number;
    height: number;
    dpr: number;
    nowMs: number;
    reasons: ReadonlySet<OverlayInvalidationReason>;
    root: HTMLDivElement;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
const overlay = wgpu.createOverlay.system({ camera, scene });
overlay.addLayer(wgpu.createOverlay.grid({ extentMode: "scene-fit", plane: "xy" }));
overlay.update({ force: true });
```

## See Also
- [createOverlay.grid](./createoverlay-grid.md)
- [createOverlay.system#update](./createoverlay-system-update.md)
- [createScene#getBounds](./createscene-getbounds.md)
