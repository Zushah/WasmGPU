# geometry.cylinder

## Summary
geometry.cylinder creates an indexed Y-axis cylinder or truncated cone with smooth side normals. Top and bottom radii default to `0.5`, height to `1`, and subdivisions to `32 × 1`; caps are included unless `openEnded` is true.

## Syntax
```ts
WasmGPU.geometry.cylinder(radiusTop?: number, radiusBottom?: number, height?: number, radialSegments?: number, heightSegments?: number, openEnded?: boolean): Geometry
const result = wgpu.geometry.cylinder(radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `radiusTop` | `number` | No | Top radius; default `0.5`. Use a different bottom radius for a truncated cone. |
| `radiusBottom` | `number` | No | Bottom radius; default `0.5`. |
| `height` | `number` | No | Y-axis height; default `1`. |
| `radialSegments` | `number` | No | Subdivisions around the circumference; default `32`. Supply a positive integer. |
| `heightSegments` | `number` | No | Subdivisions along the Y axis; default `1`. Supply a positive integer. |
| `openEnded` | `boolean` | No | Omits both caps when `true`; default `false`. |

## Returns
`Geometry` - Indexed cylinder or truncated-cone geometry with side normals, UVs, computed bounds, and—unless `openEnded` is `true`—top and bottom caps.

## See Also
- [geometry.box](./geometry-box.md)
- [geometry.custom](./geometry-custom.md)
- [geometry.prism](./geometry-prism.md)
