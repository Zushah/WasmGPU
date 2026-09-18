# geometry.rectangle

## Summary
geometry.rectangle creates a centered, indexed, UV-mapped rectangle in the selected coordinate plane. `doubleSided: true` duplicates reversed-winding geometry; width and height default to `1`.

## Syntax
```ts
WasmGPU.geometry.rectangle(width?: number, height?: number, plane?: "xy" | "xz" | "yz", doubleSided?: boolean): Geometry
const result = wgpu.geometry.rectangle(width, height, plane, doubleSided);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `width` | `number` | No | Horizontal extent; default `1`. |
| `height` | `number` | No | Vertical extent; default `1`. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Coordinate plane containing the rectangle; default `"xy"`. |
| `doubleSided` | `boolean` | No | Duplicates vertices and reversed-winding indices when `true`; default `false`. |

## Returns
`Geometry` - Indexed rectangle in the selected plane, with normals, UVs, and computed bounds.

## See Also
- [geometry.circle](./geometry-circle.md)
- [geometry.custom](./geometry-custom.md)
- [geometry.triangle](./geometry-triangle.md)
