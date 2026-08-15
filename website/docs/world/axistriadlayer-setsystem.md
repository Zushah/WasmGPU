# AxisTriadLayer.setSystem

## Summary
AxisTriadLayer.setSystem stores the owning overlay system reference used for invalidation flows. OverlaySystem calls this automatically when adding or removing layers. Manual calls are only needed in advanced custom lifecycle wiring.

## Syntax
```ts
AxisTriadLayer.setSystem(system: OverlaySystemLike | null): void
layer.setSystem(system);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `system` | `OverlaySystemLike \| null` | Yes | Owning system reference, or `null` when detaching. |

## Returns
`void` - No return value.

## Type Details
### OverlaySystemLike

```ts
type OverlaySystemLike = {
    invalidate: (reason?: OverlayInvalidationReason) => void;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
const triad = wgpu.createOverlay.axisTriad();
overlay.addLayer(triad); // setSystem called internally
```

## See Also
- [AxisTriadLayer.attach](./axistriadlayer-attach.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
- [OverlaySystem.removeLayer](./overlaysystem-removelayer.md)
