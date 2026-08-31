# AxisTriadLayer.setColors

## Summary
AxisTriadLayer.setColors sets the CSS colors used for the X, Y, and Z axes.
The tuple order is X, Y, then Z.

## Syntax
```ts
AxisTriadLayer.setColors(colors: [string, string, string]): this
layer.setColors(colors);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `colors` | `[string, string, string]` | Yes | CSS colors for X, Y, and Z. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type AxisColors = [string, string, string];
```

## Example
```js
const layer = wgpu.createOverlay.axisTriad();
layer.setColors(["#f44", "#4d6", "#48f"]);
```

## See Also
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
