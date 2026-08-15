# WasmGPU.createOverlay.axisTriad

## Summary
WasmGPU.createOverlay.axisTriad creates an `AxisTriadLayer` for orientation feedback. The layer can be anchored to a fixed screen corner or to a world-space position. Register it with `OverlaySystem.addLayer(...)` to keep orientation visible during interaction.

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
- [WasmGPU.createOverlay.system](./wasmgpu-createoverlay-system.md)
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [AxisTriadLayer.update](./axistriadlayer-update.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
