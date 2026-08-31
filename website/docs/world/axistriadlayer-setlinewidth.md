# AxisTriadLayer.setLineWidth

## Summary
AxisTriadLayer.setLineWidth sets the axis line width in CSS pixels.
Values are clamped to at least `1` pixel.

## Syntax
```ts
AxisTriadLayer.setLineWidth(value: number): this
layer.setLineWidth(value);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | `number` | Yes | Axis line width in CSS pixels. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The effective value is `Math.max(1, value)`.

## Example
```js
const layer = wgpu.createOverlay.axisTriad();
layer.setLineWidth(3);
```

## See Also
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
