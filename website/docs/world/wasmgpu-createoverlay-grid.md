# WasmGPU.createOverlay.grid

## Summary
WasmGPU.createOverlay.grid creates a `GridLayer` for projected planar references and labeled ticks. The layer can auto-fit scene bounds (`scene-fit`) or use fixed extents, making it useful for both dynamic and static analyses. Add the layer to an `OverlaySystem` to render it.

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
- [WasmGPU.createOverlay.system](./wasmgpu-createoverlay-system.md)
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [GridLayer.update](./gridlayer-update.md)
- [Scene.getBounds](./scene-getbounds.md)
