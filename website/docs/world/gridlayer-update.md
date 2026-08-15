# GridLayer.update

## Summary
GridLayer.update recomputes projected grid lines, major/minor spacing, and labels for current camera/scene state. In `scene-fit` mode it derives extents from scene bounds; in `fixed` mode it uses configured limits. OverlaySystem invokes this during update passes.

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
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [OverlaySystem.update](./overlaysystem-update.md)
- [Scene.getBounds](./scene-getbounds.md)
