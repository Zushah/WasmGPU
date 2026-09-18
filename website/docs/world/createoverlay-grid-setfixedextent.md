# createOverlay.grid#setFixedExtent

## Summary
createOverlay.grid#setFixedExtent sets fixed bounds along the grid's U and V axes.
The values take effect while `extentMode` is `"fixed"`. Supply four finite endpoints. Either ordering is accepted for each pair; the lower and upper values are resolved when the extent is used.

## Syntax
```ts
GridLayer.setFixedExtent(uMin: number, uMax: number, vMin: number, vMax: number): this
layer.setFixedExtent(uMin, uMax, vMin, vMax);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `uMin` | `number` | Yes | First finite U-axis endpoint. |
| `uMax` | `number` | Yes | Second finite U-axis endpoint. |
| `vMin` | `number` | Yes | First finite V-axis endpoint. |
| `vMax` | `number` | Yes | Second finite V-axis endpoint. |

## Returns
`this` - The same instance for method chaining.

## Type Details
Changing any value invalidates overlay layout; passing all current values is a no-op. Reversing an endpoint pair does not reverse the rendered axis extent.

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setExtentMode("fixed").setFixedExtent(-10, 10, -5, 5);
```

## See Also
- [createOverlay.grid](./createoverlay-grid.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
