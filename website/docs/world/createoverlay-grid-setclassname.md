# createOverlay.grid#setClassName

## Summary
createOverlay.grid#setClassName sets the additional CSS class on the grid container.
The attached container is updated immediately.

## Syntax
```ts
GridLayer.setClassName(className: string): this
layer.setClassName(className);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `className` | `string` | Yes | Additional CSS class, or empty string to remove it. |

## Returns
`this` - The same instance for method chaining.

## Type Details
The base `wasmgpu-overlay-grid` class is retained.

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setClassName("analysis-grid");
```

## See Also
- [createOverlay.grid](./createoverlay-grid.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
