# createOverlay.axisTriad

## Summary
createOverlay.axisTriad creates an `AxisTriadLayer` for orientation feedback. The layer can be anchored to a fixed screen corner or to a world-space position. Register it with `OverlaySystem.addLayer(...)` to keep orientation visible during interaction.

## Syntax
```ts
WasmGPU.createOverlay.axisTriad(descriptor?: AxisTriadLayerDescriptor): AxisTriadLayer
const layer = wgpu.createOverlay.axisTriad(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `AxisTriadLayerDescriptor` | No | Optional anchor, styling, and label configuration for the triad. |

## Returns
`AxisTriadLayer` - Triad layer instance that can be attached to an `OverlaySystem`.

## Type Details
### OverlayAnchorDescriptor

```ts
type OverlayAnchorDescriptor = ScreenAnchorDescriptor | WorldAnchorDescriptor;
```

### ScreenAnchorDescriptor

```ts
type ScreenAnchorDescriptor = {
    kind: "screen";
    corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    x?: number;
    y?: number;
    offsetPx?: [number, number];
};
```

### WorldAnchorDescriptor

```ts
type WorldAnchorDescriptor = {
    kind: "world";
    position: [number, number, number];
};
```

### AxisTriadLayerDescriptor

```ts
type AxisTriadLayerDescriptor = {
    id?: string;
    anchor?: OverlayAnchorDescriptor;
    lengthWorld?: number;
    sizePx?: number;
    lineWidthPx?: number;
    labels?: [string, string, string];
    colors?: [string, string, string];
    labelOffsetPx?: number;
    font?: string;
    directions?: AxisTriadDirections;
    negativeLabels?: [string, string, string];
    arrowSizePx?: number;
    originSizePx?: number;
    className?: string;
    style?: AxisTriadStyle;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
const overlay = wgpu.createOverlay.system({ camera });
const axisTriad = wgpu.createOverlay.axisTriad({
    anchor: { kind: "screen", corner: "bottom-left", offsetPx: [28, -28] },
    sizePx: 64,
    labels: ["X", "Y", "Z"]
});
overlay.addLayer(axisTriad);
```

## See Also
- [createOverlay.axisTriad#setAnchor](./createoverlay-axistriad-setanchor.md)
- [createOverlay.axisTriad#setDirections](./createoverlay-axistriad-setdirections.md)
- [createOverlay.axisTriad#setLabels](./createoverlay-axistriad-setlabels.md)
- [createOverlay.axisTriad#setColors](./createoverlay-axistriad-setcolors.md)
- [createOverlay.axisTriad#setLengthWorld](./createoverlay-axistriad-setlengthworld.md)
- [createOverlay.axisTriad#setSizePx](./createoverlay-axistriad-setsizepx.md)
- [createOverlay.axisTriad#setLineWidth](./createoverlay-axistriad-setlinewidth.md)
- [createOverlay.axisTriad#setArrowSize](./createoverlay-axistriad-setarrowsize.md)
- [createOverlay.axisTriad#setOriginSize](./createoverlay-axistriad-setoriginsize.md)
- [createOverlay.axisTriad#setLabelAppearance](./createoverlay-axistriad-setlabelappearance.md)
- [createOverlay.axisTriad#setClassName](./createoverlay-axistriad-setclassname.md)
- [createOverlay.axisTriad#setStyle](./createoverlay-axistriad-setstyle.md)
- [createOverlay.system](./createoverlay-system.md)
- [createOverlay.grid](./createoverlay-grid.md)
- [createOverlay.axisTriad#update](./createoverlay-axistriad-update.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
