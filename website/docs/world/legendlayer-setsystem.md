# LegendLayer.setSystem

## Summary
LegendLayer.setSystem sets or clears the owning overlay system reference. OverlaySystem invokes this automatically to let the legend invalidate the system when source visuals change.

## Syntax
```ts
LegendLayer.setSystem(system: OverlaySystemLike | null): void
layer.setSystem(system);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `system` | `OverlaySystemLike \| null` | Yes | Owning overlay system or `null` when detached. |

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
const legend = wgpu.createOverlay.legend({
    source: { scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" }
});
overlay.addLayer(legend); // setSystem called internally
```

## See Also
- [LegendLayer.setSource](./legendlayer-setsource.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
- [OverlaySystem.removeLayer](./overlaysystem-removelayer.md)
