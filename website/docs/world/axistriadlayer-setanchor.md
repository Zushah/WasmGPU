# AxisTriadLayer.setAnchor

## Summary
AxisTriadLayer.setAnchor sets the screen-corner or world-space anchor.
Changing the anchor invalidates overlay layout.

## Syntax
```ts
AxisTriadLayer.setAnchor(anchor: OverlayAnchorDescriptor): this
layer.setAnchor(anchor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `anchor` | `OverlayAnchorDescriptor` | Yes | Screen or world anchor descriptor. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type OverlayAnchorDescriptor = ScreenAnchorDescriptor | WorldAnchorDescriptor;
```

## Example
```js
const layer = wgpu.createOverlay.axisTriad();
layer.setAnchor({ kind: "screen", corner: "top-left", offsetPx: [20, 20] });
```

## See Also
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
