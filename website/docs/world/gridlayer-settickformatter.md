# GridLayer.setTickFormatter

## Summary
GridLayer.setTickFormatter sets the callback used to format U- and V-axis tick values.
The formatter receives the numeric value and `"u"` or `"v"`.

## Syntax
```ts
GridLayer.setTickFormatter(formatter: (value: number, axis: GridAxis) => string): this
layer.setTickFormatter(formatter);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `formatter` | `(value: number, axis: GridAxis) => string` | Yes | Callback producing each tick label. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type GridAxis = "u" | "v";
```

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setTickFormatter((value, axis) => `${axis}:${value.toFixed(1)}`);
```

## See Also
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
