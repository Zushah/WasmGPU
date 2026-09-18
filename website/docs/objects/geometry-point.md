# geometry.point

## Summary
geometry.point creates a square mesh by delegating to `rectangle(size, size, plane, doubleSided)`. It is a surface primitive, not a point-list vertex; size defaults to `1` and plane to `"xy"`.

## Syntax
```ts
WasmGPU.geometry.point(size?: number, plane?: "xy" | "xz" | "yz", doubleSided?: boolean): Geometry
const result = wgpu.geometry.point(size, plane, doubleSided);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `size` | `number` | No | Width and height of the square; default `1`. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Coordinate plane containing the square; default `"xy"`. |
| `doubleSided` | `boolean` | No | Duplicates vertices and reversed-winding indices when `true`; default `false`. |

## Returns
`Geometry` - Indexed square surface in the selected plane, with normals, UVs, and computed bounds.

## See Also
- [geometry.custom](./geometry-custom.md)
- [geometry.line](./geometry-line.md)
- [geometry.rectangle](./geometry-rectangle.md)
