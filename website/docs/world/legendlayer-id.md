# LegendLayer.id

## Summary
LegendLayer.id is the unique identifier OverlaySystem uses to track the legend layer instance. This ID is required for `removeLayer(id)` workflows.

## Syntax
```ts
LegendLayer.id: string
const id = layer.id;
```

## Parameters
This property does not take parameters.

## Returns
`string` - Layer identifier.

## Type Details
```ts
// Read-only string property.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const layer = wgpu.createOverlay.legend({
    id: "legend-main",
    source: { scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" }
});
console.log(layer.id);
```

## See Also
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
- [OverlaySystem.removeLayer](./overlaysystem-removelayer.md)
- [LegendLayer.setSource](./legendlayer-setsource.md)
