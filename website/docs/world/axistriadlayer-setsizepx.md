# AxisTriadLayer.setSizePx

## Summary
AxisTriadLayer.setSizePx sets the projected axis length for a screen-anchored triad.
Values are clamped to at least `8` pixels.

## Syntax
```ts
AxisTriadLayer.setSizePx(value: number): this
layer.setSizePx(value);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | `number` | Yes | Screen-space axis length in CSS pixels. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The effective value is `Math.max(8, value)`.

## Example
```js
const layer = wgpu.createOverlay.axisTriad();
layer.setSizePx(72);
```

## See Also
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
