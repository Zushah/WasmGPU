# GridLayer.setExtentMode

## Summary
GridLayer.setExtentMode selects scene-derived or explicitly fixed grid extents.
Use `setFixedExtent()` to configure fixed extents.

## Syntax
```ts
GridLayer.setExtentMode(mode: "scene-fit" | "fixed"): this
layer.setExtentMode(mode);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | `"scene-fit" | "fixed"` | Yes | How grid bounds are selected. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type GridExtentMode = "scene-fit" | "fixed";
```

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setExtentMode("fixed").setFixedExtent(-5, 5, -3, 3);
```

## See Also
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
