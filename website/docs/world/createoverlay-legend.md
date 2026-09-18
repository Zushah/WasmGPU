# createOverlay.legend

## Summary
createOverlay.legend creates a `LegendLayer` for scale-to-color interpretation. The source can be a point cloud, glyph field, nodelink node or edge mapping, latticespace, data material, or an explicit colormap/scale descriptor.

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
type OverlayLegendSource = PointCloud | GlyphField | NodeLink | LatticeSpace | OverlayLegendNodeLinkSource | DataMaterial | OverlayLegendExplicitSource;
```

Passing a `NodeLink` directly binds the legend to node scalars. Use `OverlayLegendNodeLinkSource` when you want the legend to follow edge scalars instead.
Passing a `LatticeSpace` follows its scalar scale transform and colormap. GPU-only colormaps cannot be sampled in strict CPU-parity mode.

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
    orientation?: "vertical" | "horizontal";
    subtitle?: string;
    units?: string;
    className?: string;
    style?: LegendStyle;
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
- [createOverlay.legend#setOrientation](./createoverlay-legend-setorientation.md)
- [createOverlay.legend#setTitle](./createoverlay-legend-settitle.md)
- [createOverlay.legend#setSubtitle](./createoverlay-legend-setsubtitle.md)
- [createOverlay.legend#setUnits](./createoverlay-legend-setunits.md)
- [createOverlay.legend#setAnchor](./createoverlay-legend-setanchor.md)
- [createOverlay.legend#setGradientSize](./createoverlay-legend-setgradientsize.md)
- [createOverlay.legend#setTickPresentation](./createoverlay-legend-settickpresentation.md)
- [createOverlay.legend#setClassName](./createoverlay-legend-setclassname.md)
- [createOverlay.legend#setStyle](./createoverlay-legend-setstyle.md)
- [createOverlay.system](./createoverlay-system.md)
- [createOverlay.legend#setSource](./createoverlay-legend-setsource.md)
- [createOverlay.legend#update](./createoverlay-legend-update.md)
- [WasmGPU.createPointCloud](../objects/wasmgpu-createpointcloud.md)
- [WasmGPU.createNodeLink](../objects/wasmgpu-createnodelink.md)
- [WasmGPU.createLatticeSpace](../objects/wasmgpu-createlatticespace.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
