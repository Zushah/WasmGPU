# createOverlay.legend#setOrientation

## Summary
createOverlay.legend#setOrientation sets the legend orientation.
Accepted orientations are `"vertical"` and `"horizontal"`.

## Syntax
```ts
LegendLayer.setOrientation(orientation: LegendOrientation): this
layer.setOrientation(orientation);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `orientation` | `LegendOrientation` | Yes | Vertical or horizontal gradient layout. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type LegendOrientation = "vertical" | "horizontal";
```

## Example
```js
const legend = wgpu.createOverlay.legend({
  source: {
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 100 },
    colormap: "viridis",
  },
});
legend.setOrientation("horizontal");
```

## See Also
- [createOverlay.legend](./createoverlay-legend.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
