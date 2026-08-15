# AxisTriadLayer.attach

## Summary
AxisTriadLayer.attach creates layer DOM nodes under the overlay root and prepares axis line/label elements. This is normally called by `OverlaySystem.addLayer` rather than directly. Call it manually only when integrating outside OverlaySystem.

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

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
const triad = wgpu.createOverlay.axisTriad({ id: "triad-main" });
overlay.addLayer(triad); // calls attach internally
```

## See Also
- [AxisTriadLayer.detach](./axistriadlayer-detach.md)
- [AxisTriadLayer.update](./axistriadlayer-update.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
