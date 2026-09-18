# createOverlay.legend#id

## Summary
createOverlay.legend#id is the unique identifier OverlaySystem uses to track the legend layer instance. This ID is required for `removeLayer(id)` workflows.

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
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
- [createOverlay.system#removeLayer](./createoverlay-system-removelayer.md)
- [createOverlay.legend#setSource](./createoverlay-legend-setsource.md)
