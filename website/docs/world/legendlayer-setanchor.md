# LegendLayer.setAnchor

## Summary
LegendLayer.setAnchor sets the legend's screen-space anchor.
Changing the anchor invalidates overlay layout.

## Syntax
```ts
LegendLayer.setAnchor(anchor: ScreenAnchorDescriptor): this
layer.setAnchor(anchor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `anchor` | `ScreenAnchorDescriptor` | Yes | Screen corner, optional coordinates, and pixel offset. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type ScreenAnchorDescriptor = { kind: "screen"; corner?: ScreenCorner; x?: number; y?: number; offsetPx?: [number, number] };
```

## Example
```js
const legend = wgpu.createOverlay.legend({
  source: {
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 100 },
    colormap: "viridis",
  },
});
legend.setAnchor({ kind: "screen", corner: "bottom-right", offsetPx: [-16, -16] });
```

## See Also
- [WasmGPU.createOverlay.legend](./wasmgpu-createoverlay-legend.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
