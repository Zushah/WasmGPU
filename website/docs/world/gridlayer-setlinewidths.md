# GridLayer.setLineWidths

## Summary
GridLayer.setLineWidths sets minor and major grid line widths.
Both widths are clamped to at least `1` pixel.

## Syntax
```ts
GridLayer.setLineWidths(minorPx: number, majorPx: number): this
layer.setLineWidths(minorPx, majorPx);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `minorPx` | `number` | Yes | Minor-line width in CSS pixels. |
| `majorPx` | `number` | Yes | Major-line width in CSS pixels. |

## Returns
`this` - The same instance for method chaining.

## Type Details
Both effective widths are clamped to at least 1 pixel.

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setLineWidths(1, 2);
```

## See Also
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
