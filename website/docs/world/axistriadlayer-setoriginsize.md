# AxisTriadLayer.setOriginSize

## Summary
AxisTriadLayer.setOriginSize sets the origin marker size in CSS pixels.
Values are clamped to at least `2` pixels.

## Syntax
```ts
AxisTriadLayer.setOriginSize(value: number): this
layer.setOriginSize(value);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | `number` | Yes | Origin-marker size in CSS pixels. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The effective value is `Math.max(2, value)`.

## Example
```js
const layer = wgpu.createOverlay.axisTriad();
layer.setOriginSize(8);
```

## See Also
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
