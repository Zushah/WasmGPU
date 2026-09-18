# createOverlay.grid

## Summary
createOverlay.grid creates a `GridLayer` for projected planar references and labeled ticks. The layer can auto-fit scene bounds (`scene-fit`) or use fixed extents, making it useful for both dynamic and static analyses. Add the layer to an `OverlaySystem` to render it.

## Syntax
```ts
WasmGPU.createOverlay.grid(descriptor?: GridLayerDescriptor): GridLayer
const layer = wgpu.createOverlay.grid(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `GridLayerDescriptor` | No | Optional grid plane, extent, spacing, and style controls. |

## Returns
`GridLayer` - Grid layer instance for `overlay.addLayer(...)`.

## Type Details
### GridPlane

```ts
type GridPlane = "xy" | "xz" | "yz";
```

### GridLayerDescriptor

```ts
type GridLayerDescriptor = {
    id?: string;
    plane?: GridPlane;
    origin?: [number, number, number];
    extentMode?: "scene-fit" | "fixed";
    fixedUMin?: number;
    fixedUMax?: number;
    fixedVMin?: number;
    fixedVMax?: number;
    targetMinorSpacingPx?: number;
    majorStepFactor?: number;
    minLabelSpacingPx?: number;
    maxLines?: number;
    maxLabels?: number;
    minorColor?: string;
    majorColor?: string;
    axisColor?: string;
    labelColor?: string;
    lineWidthMinorPx?: number;
    lineWidthMajorPx?: number;
    font?: string;
    tickFormatter?: (value: number, axis: GridAxis) => string;
    uAxis?: GridAxisMetadata;
    vAxis?: GridAxisMetadata;
    className?: string;
    style?: GridStyle;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
const overlay = wgpu.createOverlay.system({ camera, scene });

const grid = wgpu.createOverlay.grid({
    plane: "xy",
    extentMode: "scene-fit",
    targetMinorSpacingPx: 28,
    majorStepFactor: 5
});
overlay.addLayer(grid);
```

## See Also
- [createOverlay.grid#setPlane](./createoverlay-grid-setplane.md)
- [createOverlay.grid#setOrigin](./createoverlay-grid-setorigin.md)
- [createOverlay.grid#setExtentMode](./createoverlay-grid-setextentmode.md)
- [createOverlay.grid#setFixedExtent](./createoverlay-grid-setfixedextent.md)
- [createOverlay.grid#setSpacing](./createoverlay-grid-setspacing.md)
- [createOverlay.grid#setColors](./createoverlay-grid-setcolors.md)
- [createOverlay.grid#setLineWidths](./createoverlay-grid-setlinewidths.md)
- [createOverlay.grid#setFont](./createoverlay-grid-setfont.md)
- [createOverlay.grid#setTickFormatter](./createoverlay-grid-settickformatter.md)
- [createOverlay.grid#setAxisMetadata](./createoverlay-grid-setaxismetadata.md)
- [createOverlay.grid#setLabelSides](./createoverlay-grid-setlabelsides.md)
- [createOverlay.grid#setClassName](./createoverlay-grid-setclassname.md)
- [createOverlay.grid#setStyle](./createoverlay-grid-setstyle.md)
- [createOverlay.system](./createoverlay-system.md)
- [createOverlay.axisTriad](./createoverlay-axistriad.md)
- [createOverlay.grid#update](./createoverlay-grid-update.md)
- [createScene#getBounds](./createscene-getbounds.md)
