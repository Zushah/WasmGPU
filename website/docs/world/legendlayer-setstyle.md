# LegendLayer.setStyle

## Summary
LegendLayer.setStyle replaces the legend's element-level CSS style overrides.
Current DOM nodes are restyled and overlay layout is invalidated.

## Syntax
```ts
LegendLayer.setStyle(style: LegendStyle): this
layer.setStyle(style);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `style` | `LegendStyle` | Yes | Replacement element-level CSS overrides. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type LegendStyle = { container?: OverlayCSSStyle; title?: OverlayCSSStyle; subtitle?: OverlayCSSStyle; gradient?: OverlayCSSStyle; tickMark?: OverlayCSSStyle; tickLabel?: OverlayCSSStyle; units?: OverlayCSSStyle };
```

## Example
```js
const legend = wgpu.createOverlay.legend({
  source: {
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 100 },
    colormap: "viridis",
  },
});
legend.setStyle({ title: { fontWeight: "700" }, container: { backdropFilter: "blur(4px)" } });
```

## See Also
- [WasmGPU.createOverlay.legend](./wasmgpu-createoverlay-legend.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
