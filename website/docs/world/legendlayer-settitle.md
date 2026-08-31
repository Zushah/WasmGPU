# LegendLayer.setTitle

## Summary
LegendLayer.setTitle sets the legend title.
The attached title element is updated immediately.

## Syntax
```ts
LegendLayer.setTitle(title: string): this
layer.setTitle(title);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `title` | `string` | Yes | Primary legend heading. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The title remains in the DOM; an empty string renders no text.

## Example
```js
const legend = wgpu.createOverlay.legend({
  source: {
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 100 },
    colormap: "viridis",
  },
});
legend.setTitle("Velocity");
```

## See Also
- [WasmGPU.createOverlay.legend](./wasmgpu-createoverlay-legend.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
