# GridLayer.setSpacing

## Summary
GridLayer.setSpacing sets target minor-line, major-line, and label spacing.
Optional values preserve their current settings; inputs are clamped to supported minima.

## Syntax
```ts
GridLayer.setSpacing(targetMinorSpacingPx: number, majorStepFactor?: number, minLabelSpacingPx?: number): this
layer.setSpacing(targetMinorSpacingPx, majorStepFactor, minLabelSpacingPx);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `targetMinorSpacingPx` | `number` | Yes | Target minor-line spacing in CSS pixels. |
| `majorStepFactor` | `number` | No | Minor steps per major step; defaults to current value. |
| `minLabelSpacingPx` | `number` | No | Minimum label spacing; defaults to current value. |

## Returns
`this` - The same instance for method chaining.

## Type Details
Spacing values are clamped to the supported positive minima before layout.

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setSpacing(28, 5, 72);
```

## See Also
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
