# GridLayer.setPlane

## Summary
GridLayer.setPlane sets the projected grid plane.
Accepted planes are `"xy"`, `"xz"`, and `"yz"`.

## Syntax
```ts
GridLayer.setPlane(plane: GridPlane): this
layer.setPlane(plane);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `plane` | `GridPlane` | Yes | Projected plane: `"xy"`, `"xz"`, or `"yz"`. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type GridPlane = "xy" | "xz" | "yz";
```

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setPlane("xz");
```

## See Also
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
