# createOverlay.axisTriad#attach

## Summary
createOverlay.axisTriad#attach creates layer DOM nodes under the overlay root and prepares axis line/label elements. This is normally called by `OverlaySystem.addLayer` rather than directly. Call it manually only when integrating outside OverlaySystem.

## Syntax
```ts
AxisTriadLayer.attach(root: HTMLDivElement): void
layer.attach(root);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `root` | `HTMLDivElement` | Yes | Overlay root container where triad DOM nodes are inserted. |

## Returns
`void` - No return value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
const triad = wgpu.createOverlay.axisTriad({ id: "triad-main" });
overlay.addLayer(triad);
```

## See Also
- [createOverlay.axisTriad#detach](./createoverlay-axistriad-detach.md)
- [createOverlay.axisTriad#update](./createoverlay-axistriad-update.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
