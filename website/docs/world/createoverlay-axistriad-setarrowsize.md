# createOverlay.axisTriad#setArrowSize

## Summary
createOverlay.axisTriad#setArrowSize sets the arrowhead size in CSS pixels.
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
- [createOverlay.axisTriad](./createoverlay-axistriad.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
