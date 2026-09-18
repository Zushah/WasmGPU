# createOverlay.grid#setStyle

## Summary
createOverlay.grid#setStyle replaces the grid's element-level CSS style overrides.
Current DOM nodes are restyled and overlay layout is invalidated.

## Syntax
```ts
GridLayer.setStyle(style: GridStyle): this
layer.setStyle(style);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `style` | `GridStyle` | Yes | Replacement element-level style overrides. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type GridStyle = { container?: OverlayCSSStyle; minorLine?: OverlayCSSStyle; majorLine?: OverlayCSSStyle; zeroAxisLine?: OverlayCSSStyle; tickLabel?: OverlayCSSStyle; axisTitle?: OverlayCSSStyle };
```

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setStyle({ tickLabel: { color: "#eef" }, majorLine: { opacity: "0.8" } });
```

## See Also
- [createOverlay.grid](./createoverlay-grid.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
