# geometry.plane

## Summary
geometry.plane creates an indexed subdivided plane centered at the origin in the XZ plane, with +Y normals and UVs. Dimensions and segment counts default to `1`; both segment counts must be positive integers.

## Syntax
```ts
WasmGPU.geometry.plane(width?: number, height?: number, widthSegments?: number, heightSegments?: number): Geometry
const result = wgpu.geometry.plane(width, height, widthSegments, heightSegments);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `width` | `number` | No | X-axis extent; default `1`. |
| `height` | `number` | No | Z-axis extent; default `1`. |
| `widthSegments` | `number` | No | Positive integer X subdivision count; default `1`. |
| `heightSegments` | `number` | No | Positive integer Z subdivision count; default `1`. |

## Returns
`Geometry` - Indexed subdivided XZ plane with positive-Y normals, UVs, and computed bounds.

## See Also
- [geometry.custom](./geometry-custom.md)
- [geometry.parametricSurface](./geometry-parametricsurface.md)
- [geometry.rectangle](./geometry-rectangle.md)
