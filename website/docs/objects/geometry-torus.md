# geometry.torus

## Summary
geometry.torus creates an indexed Y-axis torus centered at the origin. Major radius defaults to `0.5`, tube radius to `0.2`, and subdivision counts to `32` radial by `24` tubular; both counts must be positive integers.

## Syntax
```ts
WasmGPU.geometry.torus(radius?: number, tube?: number, radialSegments?: number, tubularSegments?: number): Geometry
const result = wgpu.geometry.torus(radius, tube, radialSegments, tubularSegments);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `radius` | `number` | No | Distance from the origin to the center of the tube; default `0.5`. |
| `tube` | `number` | No | Radius of the tube; default `0.2`. |
| `radialSegments` | `number` | No | Positive integer subdivisions around the tube cross-section; default `32`. |
| `tubularSegments` | `number` | No | Positive integer subdivisions around the major ring; default `24`. |

## Returns
`Geometry` - Indexed torus geometry with normals, UVs, and computed bounds.

## See Also
- [geometry.circle](./geometry-circle.md)
- [geometry.custom](./geometry-custom.md)
- [geometry.cylinder](./geometry-cylinder.md)
