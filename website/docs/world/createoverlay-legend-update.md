# createOverlay.legend#update

## Summary
createOverlay.legend#update repositions the legend, resolves source transform/colormap information, and redraws gradient/ticks when needed. It reacts to invalidation reasons such as scale, colormap, viewport, and layout changes. Source-resolution or CPU-sampling errors are caught and displayed in the legend rather than thrown from `update()`. OverlaySystem calls this during update passes.

## Syntax
```ts
LegendLayer.update(ctx: OverlayUpdateContext): void
layer.update(ctx);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `ctx` | `OverlayUpdateContext` | Yes | Overlay frame context with camera, scene, viewport, and reason set. |

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

const overlay = wgpu.createOverlay.system({ autoUpdate: false });
const legend = wgpu.createOverlay.legend({
    source: { scaleTransform: { mode: "linear", domainMin: 0, domainMax: 10 }, colormap: "inferno" }
});
overlay.addLayer(legend);
overlay.update({ force: true, reasons: ["manual", "scale"] });
```

## See Also
- [createOverlay.legend#setSource](./createoverlay-legend-setsource.md)
- [createOverlay.system#update](./createoverlay-system-update.md)
- [createOverlay.system#invalidate](./createoverlay-system-invalidate.md)
