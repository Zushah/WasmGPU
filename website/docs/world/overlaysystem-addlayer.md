# OverlaySystem.addLayer

## Summary
OverlaySystem.addLayer registers a layer, attaches it to the overlay root, and invalidates for redraw. Layer IDs must be unique; duplicate IDs throw an error. Use this to activate axis triad, grid, legend, or custom overlay layers.

## Syntax
```ts
OverlaySystem.addLayer(layer: OverlayLayer): OverlaySystem
const result = overlay.addLayer(layer);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `layer` | `OverlayLayer` | Yes | Layer instance implementing attach/detach/update lifecycle methods. |

## Returns
`OverlaySystem` - The same overlay system instance after layer registration.

## Type Details
### OverlayLayer

```ts
interface OverlayLayer {
    readonly id: string;
    attach(root: HTMLDivElement): void;
    detach(): void;
    update(ctx: OverlayUpdateContext): void;
    setSystem?(system: OverlaySystemLike | null): void;
}
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
const overlay = wgpu.createOverlay.system({ camera });
const triad = wgpu.createOverlay.axisTriad({ sizePx: 64 });
overlay.addLayer(triad);
```

## See Also
- [OverlaySystem.removeLayer](./overlaysystem-removelayer.md)
- [OverlaySystem.clearLayers](./overlaysystem-clearlayers.md)
- [AxisTriadLayer.attach](./axistriadlayer-attach.md)
- [GridLayer.attach](./gridlayer-attach.md)
- [LegendLayer.attach](./legendlayer-attach.md)
