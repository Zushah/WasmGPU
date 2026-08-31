# AxisTriadLayer.setDirections

## Summary
AxisTriadLayer.setDirections sets which positive or negative direction is shown for each axis.
Omitted axis fields retain their current direction.

## Syntax
```ts
AxisTriadLayer.setDirections(directions: AxisTriadDirections): this
layer.setDirections(directions);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `directions` | `AxisTriadDirections` | Yes | Per-axis positive, negative, both, or none selection. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type AxisTriadDirection = "positive" | "negative" | "both" | "none";
type AxisTriadDirections = {
    x?: AxisTriadDirection;
    y?: AxisTriadDirection;
    z?: AxisTriadDirection;
};
```

## Example
```js
const layer = wgpu.createOverlay.axisTriad();
layer.setDirections({ x: "both", y: "positive", z: "none" });
```

## See Also
- [WasmGPU.createOverlay.axisTriad](./wasmgpu-createoverlay-axistriad.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
