# geometry.box

## Summary
geometry.box creates an indexed, UV-mapped box centered at the origin, with separate vertices and flat normals for each face. Width, height, and depth default to `1`.

## Syntax
```ts
WasmGPU.geometry.box(width?: number, height?: number, depth?: number): Geometry
const result = wgpu.geometry.box(width, height, depth);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `width` | `number` | No | X-axis extent; default `1`. |
| `height` | `number` | No | Y-axis extent; default `1`. |
| `depth` | `number` | No | Z-axis extent; default `1`. |

## Returns
`Geometry` - Indexed box geometry with face normals, UVs, and computed bounds.

## See Also
- [geometry.custom](./geometry-custom.md)
- [geometry.pyramid](./geometry-pyramid.md)
- [geometry.sphere](./geometry-sphere.md)
