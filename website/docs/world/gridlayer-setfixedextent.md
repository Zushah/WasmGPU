# GridLayer.setFixedExtent

## Summary
GridLayer.setFixedExtent sets fixed bounds along the grid's U and V axes.
The values are stored exactly as supplied and take effect while `extentMode` is `"fixed"`.

## Syntax
```ts
GridLayer.setFixedExtent(uMin: number, uMax: number, vMin: number, vMax: number): this
layer.setFixedExtent(uMin, uMax, vMin, vMax);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `uMin` | `number` | Yes | Minimum U coordinate. |
| `uMax` | `number` | Yes | Maximum U coordinate. |
| `vMin` | `number` | Yes | Minimum V coordinate. |
| `vMax` | `number` | Yes | Maximum V coordinate. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The method does not reorder or validate minimum/maximum pairs. Supply `uMin <= uMax` and `vMin <= vMax` for a conventional visible extent. Changing any value invalidates overlay layout; passing all current values is a no-op.

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setExtentMode("fixed").setFixedExtent(-10, 10, -5, 5);
```

## See Also
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
