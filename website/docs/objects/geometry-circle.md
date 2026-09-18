# geometry.circle

## Summary
geometry.circle creates an indexed triangle-fan disk in the selected coordinate plane. Radius defaults to `0.5`; the segment count defaults to `64` and is floored and clamped to at least `3`. `doubleSided` duplicates reversed-winding geometry.

## Syntax
```ts
WasmGPU.geometry.circle(radius?: number, segments?: number, plane?: "xy" | "xz" | "yz", doubleSided?: boolean): Geometry
const result = wgpu.geometry.circle(radius, segments, plane, doubleSided);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `radius` | `number` | No | Disk radius; default `0.5`. |
| `segments` | `number` | No | Circumference subdivisions; floored and clamped to at least `3`, default `64`. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Coordinate plane containing the disk; default `"xy"`. |
| `doubleSided` | `boolean` | No | Duplicates vertices and reversed-winding indices when `true`; default `false`. |

## Returns
`Geometry` - Indexed disk geometry in the selected plane, with normals, UVs, and computed bounds.

## See Also
- [geometry.custom](./geometry-custom.md)
- [geometry.ellipse](./geometry-ellipse.md)
- [geometry.rectangle](./geometry-rectangle.md)
