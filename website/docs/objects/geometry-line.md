# geometry.line

## Summary
geometry.line creates a thin rectangular surface of the requested length and thickness. It is triangle geometry rather than a WebGPU line-list primitive; defaults are length `1`, thickness `0.01`, and plane `"xy"`.

## Syntax
```ts
WasmGPU.geometry.line(length?: number, thickness?: number, plane?: "xy" | "xz" | "yz", doubleSided?: boolean): Geometry
const result = wgpu.geometry.line(length, thickness, plane, doubleSided);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `length` | `number` | No | Rectangle length; default `1`. |
| `thickness` | `number` | No | Rectangle thickness; default `0.01`. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Coordinate plane containing the rectangle; default `"xy"`. |
| `doubleSided` | `boolean` | No | Duplicates vertices and reversed-winding indices when `true`; default `false`. |

## Returns
`Geometry` - Indexed rectangular line surface in the selected plane, with normals, UVs, and computed bounds.

## See Also
- [geometry.custom](./geometry-custom.md)
- [geometry.point](./geometry-point.md)
- [geometry.rectangle](./geometry-rectangle.md)
