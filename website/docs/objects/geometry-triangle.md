# geometry.triangle

## Summary
geometry.triangle creates a centered, UV-mapped triangle in the selected coordinate plane. `doubleSided: true` duplicates reversed-winding geometry rather than changing material culling; width and height default to `1`.

## Syntax
```ts
WasmGPU.geometry.triangle(width?: number, height?: number, plane?: "xy" | "xz" | "yz", doubleSided?: boolean): Geometry
const result = wgpu.geometry.triangle(width, height, plane, doubleSided);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `width` | `number` | No | Base width; default `1`. |
| `height` | `number` | No | Altitude; default `1`. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Coordinate plane containing the triangle; default `"xy"`. |
| `doubleSided` | `boolean` | No | Duplicates vertices and reversed-winding indices when `true`; default `false`. |

## Returns
`Geometry` - Indexed triangle in the selected plane, with normals, UVs, and computed bounds.

## See Also
- [geometry.custom](./geometry-custom.md)
- [geometry.rectangle](./geometry-rectangle.md)
- [geometry.point](./geometry-point.md)
