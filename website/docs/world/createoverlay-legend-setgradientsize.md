# createOverlay.legend#setGradientSize

## Summary
createOverlay.legend#setGradientSize sets the gradient width and height in CSS pixels.
Dimensions are rounded and clamped to at least `8` pixels.

## Syntax
```ts
LegendLayer.setGradientSize(widthPx: number, heightPx: number): this
layer.setGradientSize(widthPx, heightPx);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `widthPx` | `number` | Yes | Gradient width in CSS pixels. |
| `heightPx` | `number` | Yes | Gradient height in CSS pixels. |

## Returns
`this` - The same instance for method chaining.

## Type Details
Both dimensions are rounded and clamped to at least 8 pixels.

## Example
```js
const legend = wgpu.createOverlay.legend({
  source: {
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 100 },
    colormap: "viridis",
  },
});
legend.setGradientSize(220, 24);
```

## See Also
- [createOverlay.legend](./createoverlay-legend.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
