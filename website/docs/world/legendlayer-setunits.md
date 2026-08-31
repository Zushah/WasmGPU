# LegendLayer.setUnits

## Summary
LegendLayer.setUnits sets the optional units label.
An empty string hides the units element.

## Syntax
```ts
LegendLayer.setUnits(units: string): this
layer.setUnits(units);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `units` | `string` | Yes | Units label, or empty string to hide it. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The units element is shown only for a non-empty value.

## Example
```js
const legend = wgpu.createOverlay.legend({
  source: {
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 100 },
    colormap: "viridis",
  },
});
legend.setUnits("m/s");
```

## See Also
- [WasmGPU.createOverlay.legend](./wasmgpu-createoverlay-legend.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
