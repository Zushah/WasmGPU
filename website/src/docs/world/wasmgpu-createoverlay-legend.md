# WasmGPU.createOverlay.legend

## Summary
WasmGPU.createOverlay.legend creates a `LegendLayer` for scale-to-color interpretation. The source can be a point cloud, glyph field, nodelink node or edge mapping, data material, or an explicit colormap/scale descriptor. Add the layer to an `OverlaySystem` to display a synchronized legend during interaction.

## Syntax
```ts
WasmGPU.createOverlay.legend(descriptor: LegendLayerDescriptor): LegendLayer
const layer = wgpu.createOverlay.legend(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `LegendLayerDescriptor` | Yes | Source binding and layout/format settings for the legend. |

## Returns
`LegendLayer` - Legend layer instance for `overlay.addLayer(...)`.

## Type Details
### BuiltinColormapName

```ts
type BuiltinColormapName = "grayscale" | "turbo" | "viridis" | "magma" | "plasma" | "inferno";
```

### Color4

```ts
type Color4 = [number, number, number, number];
```

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
type OverlayLegendSource = PointCloud | GlyphField | NodeLink | OverlayLegendNodeLinkSource | DataMaterial | OverlayLegendExplicitSource;
```

Passing a `NodeLink` directly binds the legend to node scalars. Use `OverlayLegendNodeLinkSource` when you want the legend to follow edge scalars instead.

### LegendLayerDescriptor

```ts
type LegendLayerDescriptor = {
    id?: string;
    source: OverlayLegendSource;
    title?: string;
    anchor?: ScreenAnchorDescriptor;
    widthPx?: number;
    heightPx?: number;
    tickCount?: number;
    strictParity?: boolean;
    font?: string;
    formatValue?: (value: number) => string;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
const legend = wgpu.createOverlay.legend({
    title: "Velocity Magnitude",
    source: {
        scaleTransform: { mode: "linear", domainMin: 0, domainMax: 10 },
        colormap: "viridis"
    },
    tickCount: 6
});
overlay.addLayer(legend);
```

## See Also
- [WasmGPU.createOverlay.system](./wasmgpu-createoverlay-system.md)
- [LegendLayer.setSource](./wasmgpu-world-legendlayer-setsource.md)
- [LegendLayer.update](./wasmgpu-world-legendlayer-update.md)
- [WasmGPU.createPointCloud](../objects/wasmgpu-createpointcloud.md)
- [WasmGPU.createNodeLink](../objects/wasmgpu-createnodelink.md)
- [OverlaySystem.addLayer](./wasmgpu-world-overlaysystem-addlayer.md)
