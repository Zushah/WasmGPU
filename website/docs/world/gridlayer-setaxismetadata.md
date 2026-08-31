# GridLayer.setAxisMetadata

## Summary
GridLayer.setAxisMetadata sets a grid axis name, unit, and optional label side.
An omitted label side preserves the current side for that axis.

## Syntax
```ts
GridLayer.setAxisMetadata(axis: GridAxis, metadata: GridAxisMetadata): this
layer.setAxisMetadata(axis, metadata);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `axis` | `GridAxis` | Yes | Axis to update. |
| `metadata` | `GridAxisMetadata` | Yes | Name, unit, and optional label side. |

## Returns
`this` - The same instance for method chaining.

## Type Details
```ts
type GridAxis = "u" | "v";
type GridAxisMetadata = {
    name?: string;
    unit?: string;
    labelSide?: GridLabelSide;
};
```

## Example
```js
const grid = wgpu.createOverlay.grid();
grid.setAxisMetadata("u", { name: "Distance", unit: "m", labelSide: "both" });
```

## See Also
- [WasmGPU.createOverlay.grid](./wasmgpu-createoverlay-grid.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
