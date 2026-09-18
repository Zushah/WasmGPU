# geometry.prism

## Summary
geometry.prism creates a closed, flat-sided Y-axis prism centered vertically at the origin. Radius defaults to `0.5`, height to `1`, and side count to `6`; side counts below `3` are promoted to `3`.

## Syntax
```ts
WasmGPU.geometry.prism(radius?: number, height?: number, sides?: number): Geometry
const result = wgpu.geometry.prism(radius, height, sides);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `radius` | `number` | No | Circumradius of the regular polygon cross-section; default `0.5`. |
| `height` | `number` | No | Y-axis height; default `1`. |
| `sides` | `number` | No | Number of polygon sides; values below `3` become `3`, default `6`. |

## Returns
`Geometry` - Indexed closed regular-prism geometry with flat faces, normals, UVs, and computed bounds.

## See Also
- [geometry.box](./geometry-box.md)
- [geometry.custom](./geometry-custom.md)
- [geometry.cylinder](./geometry-cylinder.md)
