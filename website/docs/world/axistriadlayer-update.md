# AxisTriadLayer.update

## Summary
AxisTriadLayer.update repositions and redraws triad lines/labels for the current camera and viewport state. In screen-anchor mode it reflects camera orientation; in world-anchor mode it projects world axes from an anchor point. OverlaySystem calls this during update passes.

## Syntax
```ts
AxisTriadLayer.update(ctx: OverlayUpdateContext): void
layer.update(ctx);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `ctx` | `OverlayUpdateContext` | Yes | Per-frame overlay context containing camera, dimensions, and invalidation reasons. |

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

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
const overlay = wgpu.createOverlay.system({ camera });
overlay.addLayer(wgpu.createOverlay.axisTriad({ sizePx: 60 }));
overlay.update({ force: true });
```

## See Also
- [OverlaySystem.update](./overlaysystem-update.md)
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [AxisTriadLayer.attach](./axistriadlayer-attach.md)
