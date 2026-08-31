# GridLayer.setColors

## Summary
GridLayer.setColors sets CSS colors for minor lines, major lines, axes, and labels.
Omitting `labelColor` preserves the current label color.

## Syntax
```ts
GridLayer.setColors(minorColor: string, majorColor: string, axisColor: string, labelColor?: string): this
layer.setColors(minorColor, majorColor, axisColor, labelColor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `minorColor` | `string` | Yes | Minor-line CSS color. |
| `majorColor` | `string` | Yes | Major-line CSS color. |
| `axisColor` | `string` | Yes | Zero-axis CSS color. |
| `labelColor` | `string` | No | Optional label CSS color. |

## Returns
`this` - The same instance for method chaining.

## Type Details
Colors are passed to CSS and may use any browser-supported color syntax.

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setColors("#334", "#668", "#fff", "#ccd");
```

## See Also
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
