# geometry.ellipse

## Summary
geometry.ellipse creates an indexed triangle-fan disk with independent radii in the selected coordinate plane. Both radii default to `0.5`; segments default to `64` and are floored and clamped to at least `3`.

## Syntax
```ts
WasmGPU.geometry.ellipse(radiusX?: number, radiusY?: number, segments?: number, plane?: "xy" | "xz" | "yz", doubleSided?: boolean): Geometry
const result = wgpu.geometry.ellipse(radiusX, radiusY, segments, plane, doubleSided);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `radiusX` | `number` | No | Radius along the first in-plane axis; default `0.5`. |
| `radiusY` | `number` | No | Radius along the second in-plane axis; default `0.5`. |
| `segments` | `number` | No | Circumference subdivisions; floored and clamped to at least `3`, default `64`. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Coordinate plane containing the ellipse; default `"xy"`. |
| `doubleSided` | `boolean` | No | Duplicates vertices and reversed-winding indices when `true`; default `false`. |

## Returns
`Geometry` - Indexed elliptical disk geometry in the selected plane, with normals, UVs, and computed bounds.

## See Also
- [geometry.circle](./geometry-circle.md)
- [geometry.custom](./geometry-custom.md)
- [geometry.rectangle](./geometry-rectangle.md)
