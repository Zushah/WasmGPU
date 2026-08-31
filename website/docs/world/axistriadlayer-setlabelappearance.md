# AxisTriadLayer.setLabelAppearance

## Summary
AxisTriadLayer.setLabelAppearance sets the label offset and optionally the CSS font.
The offset is clamped to zero or greater; omitting `font` preserves the current font.

## Syntax
```ts
AxisTriadLayer.setLabelAppearance(offsetPx: number, font?: string): this
layer.setLabelAppearance(offsetPx, font);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `offsetPx` | `number` | Yes | Distance from each endpoint to its label. |
| `font` | `string` | No | Optional CSS font; defaults to the current font. |

## Returns
`this` - The same instance for method chaining.

## Type Details
`offsetPx` is clamped to zero or greater. Omitting `font` preserves the current value.

## Example
```js
const layer = wgpu.createOverlay.axisTriad();
layer.setLabelAppearance(10, "12px system-ui");
```

## See Also
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
