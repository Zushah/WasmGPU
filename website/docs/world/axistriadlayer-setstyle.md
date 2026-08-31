# AxisTriadLayer.setStyle

## Summary
AxisTriadLayer.setStyle replaces the triad's element-level CSS style overrides.
Current DOM nodes are restyled and overlay layout is invalidated.

## Syntax
```ts
AxisTriadLayer.setStyle(style: AxisTriadStyle): this
layer.setStyle(style);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `style` | `AxisTriadStyle` | Yes | Replacement element-level CSS style map. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type AxisTriadStyle = { container?: OverlayCSSStyle; axisLine?: OverlayCSSStyle; arrowhead?: OverlayCSSStyle; label?: OverlayCSSStyle; originMarker?: OverlayCSSStyle };
```

## Example
```js
const layer = wgpu.createOverlay.axisTriad();
layer.setStyle({ label: { fontWeight: "600" }, axisLine: { opacity: "0.9" } });
```

## See Also
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
