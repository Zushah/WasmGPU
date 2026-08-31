# LegendLayer.setTickPresentation

## Summary
LegendLayer.setTickPresentation sets tick count, formatter, and font together.
Tick count is rounded and clamped to at least `2`; omitted presentation values preserve their current settings.

## Syntax
```ts
LegendLayer.setTickPresentation(tickCount: number, formatValue?: (value: number) => string, font?: string): this
layer.setTickPresentation(tickCount, formatValue, font);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `tickCount` | `number` | Yes | Requested number of labeled ticks. |
| `formatValue` | `(value: number) => string` | No | Optional value formatter. |
| `font` | `string` | No | Optional CSS font shorthand. |

## Returns
`this` - The same instance for method chaining.

## Type Details
Tick count is rounded and clamped to at least 2. Omitted formatter and font preserve current values.

## Example
```js
const legend = wgpu.createOverlay.legend({
  source: {
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 100 },
    colormap: "viridis",
  },
});
legend.setTickPresentation(5, value => value.toFixed(2), "11px monospace");
```

## See Also
- [WasmGPU.createOverlay.legend](./wasmgpu-createoverlay-legend.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
