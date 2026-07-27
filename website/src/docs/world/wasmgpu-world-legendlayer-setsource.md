# LegendLayer.setSource

## Summary
LegendLayer.setSource switches the legend data source and marks legend state dirty for redraw. Use this when changing point-cloud, glyph, nodelink, or latticespace scalar mappings interactively.

## Syntax
```ts
LegendLayer.setSource(source: OverlayLegendSource): void
layer.setSource(source);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `OverlayLegendSource` | Yes | New legend source object or explicit scale/colormap descriptor. |

## Returns
`void` - No return value.

## Type Details
### OverlayLegendExplicitSource

```ts
type OverlayLegendExplicitSource = {
    scaleTransform: ScaleTransformDescriptor | ScaleTransform;
    colormap: Colormap | BuiltinColormapName;
    colormapStops?: ReadonlyArray<Color4>;
};
```

### OverlayLegendNodeLinkSource

```ts
type OverlayLegendNodeLinkSource = {
    nodelink: NodeLink;
    component?: "node" | "edge";
};
```

### OverlayLegendSource

```ts
type OverlayLegendSource = PointCloud | GlyphField | NodeLink | LatticeSpace | OverlayLegendNodeLinkSource | DataMaterial | OverlayLegendExplicitSource;
```

Passing a `NodeLink` directly binds to node scalars. Use `{ nodelink, component: "edge" }` when the legend should track edge scale and edge colormap state.
Passing a `LatticeSpace` binds to its scale transform and colormap.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const legend = wgpu.createOverlay.legend({
    source: { scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" }
});
legend.setSource({
    scaleTransform: { mode: "linear", domainMin: -2, domainMax: 2 },
    colormap: "plasma"
});
```

## See Also
- [WasmGPU.createOverlay.legend](./wasmgpu-createoverlay-legend.md)
- [LegendLayer.update](./wasmgpu-world-legendlayer-update.md)
- [WasmGPU.createNodeLink](../objects/wasmgpu-createnodelink.md)
- [OverlaySystem.invalidate](./wasmgpu-world-overlaysystem-invalidate.md)
