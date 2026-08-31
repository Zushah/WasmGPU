# AxisTriadLayer.setArrowSize

## Summary
AxisTriadLayer.setArrowSize sets the arrowhead size in CSS pixels.
Values are clamped to at least `2` pixels.

## Syntax
```ts
AxisTriadLayer.setArrowSize(value: number): this
layer.setArrowSize(value);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | `number` | Yes | Arrowhead size in CSS pixels. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The effective value is `Math.max(2, value)`.

## Example
```js
const layer = wgpu.createOverlay.axisTriad();
layer.setArrowSize(9);
```

## See Also
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
