# GridLayer.setOrigin

## Summary
GridLayer.setOrigin sets the grid's world-space origin.
The tuple contains X, Y, and Z coordinates.

## Syntax
```ts
GridLayer.setOrigin(origin: [number, number, number]): this
layer.setOrigin(origin);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `origin` | `[number, number, number]` | Yes | World-space X/Y/Z grid origin. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type GridOrigin = [number, number, number];
```

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setOrigin([0, -1, 0]);
```

## See Also
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
