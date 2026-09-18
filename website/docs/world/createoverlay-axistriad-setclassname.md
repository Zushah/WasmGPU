# createOverlay.axisTriad#setClassName

## Summary
createOverlay.axisTriad#setClassName sets the additional CSS class on the triad container.
The attached container is updated immediately.

## Syntax
```ts
AxisTriadLayer.setClassName(className: string): this
layer.setClassName(className);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `className` | `string` | Yes | Additional CSS class, or an empty string to remove it. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The base `wasmgpu-overlay-axis-triad` class is always retained.

## Example
```js
const layer = wgpu.createOverlay.axisTriad();
layer.setClassName("analysis-axis");
```

## See Also
- [createOverlay.axisTriad](./createoverlay-axistriad.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
