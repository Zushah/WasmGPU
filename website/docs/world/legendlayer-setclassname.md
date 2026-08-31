# LegendLayer.setClassName

## Summary
LegendLayer.setClassName sets the additional CSS class on the legend container.
The attached container is updated immediately.

## Syntax
```ts
LegendLayer.setClassName(className: string): this
layer.setClassName(className);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `className` | `string` | Yes | Additional CSS class, or empty string to remove it. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The base `wasmgpu-overlay-legend` class is retained.

## Example
```js
const legend = wgpu.createOverlay.legend({
  source: {
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 100 },
    colormap: "viridis",
  },
});
legend.setClassName("temperature-legend");
```

## See Also
- [WasmGPU.createOverlay.legend](./wasmgpu-createoverlay-legend.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
