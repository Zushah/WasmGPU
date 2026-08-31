# LegendLayer.setSubtitle

## Summary
LegendLayer.setSubtitle sets the optional legend subtitle.
An empty string hides the subtitle element.

## Syntax
```ts
LegendLayer.setSubtitle(subtitle: string): this
layer.setSubtitle(subtitle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `subtitle` | `string` | Yes | Secondary heading, or empty string to hide it. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The subtitle element is shown only for a non-empty value.

## Example
```js
const legend = wgpu.createOverlay.legend({
  source: {
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 100 },
    colormap: "viridis",
  },
});
legend.setSubtitle("Time-averaged");
```

## See Also
- [WasmGPU.createOverlay.legend](./wasmgpu-createoverlay-legend.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
