# GridLayer.setLabelSides

## Summary
GridLayer.setLabelSides sets the sides on which U and V labels appear.
Each side is `"min"`, `"max"`, `"both"`, or `"none"`.

## Syntax
```ts
GridLayer.setLabelSides(u: GridLabelSide, v: GridLabelSide): this
layer.setLabelSides(u, v);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `u` | `GridLabelSide` | Yes | Label side for the U axis. |
| `v` | `GridLabelSide` | Yes | Label side for the V axis. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type GridLabelSide = "min" | "max" | "both" | "none";
```

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setLabelSides("both", "min");
```

## See Also
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
