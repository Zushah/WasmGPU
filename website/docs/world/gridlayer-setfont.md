# GridLayer.setFont

## Summary
GridLayer.setFont sets the CSS font used for grid labels.
Changing the font invalidates overlay layout.

## Syntax
```ts
GridLayer.setFont(font: string): this
layer.setFont(font);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `font` | `string` | Yes | CSS font shorthand for labels and titles. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The string is assigned to the overlay label elements' CSS `font` property.

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setFont("12px ui-monospace");
```

## See Also
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
