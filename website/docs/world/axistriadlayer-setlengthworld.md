# AxisTriadLayer.setLengthWorld

## Summary
AxisTriadLayer.setLengthWorld sets the world-space axis length for a world-anchored triad.
Values are clamped to at least `1e-6`.

## Syntax
```ts
AxisTriadLayer.setLengthWorld(value: number): this
layer.setLengthWorld(value);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `value` | `number` | Yes | World-space axis length. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The effective value is `Math.max(1e-6, value)`.

## Example
```js
const layer = wgpu.createOverlay.axisTriad();
layer.setLengthWorld(2.5);
```

## See Also
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
