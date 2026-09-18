# geometry.parametricSurface

## Summary
geometry.parametricSurface samples a 3D function over a UV grid and computes indexed triangles, normals, and texture coordinates. Both parameter ranges default to `[0, 1]`, resolution to `128 × 128`, and cells touching non-finite samples are skipped by default.

## Syntax
```ts
WasmGPU.geometry.parametricSurface(descriptor: ParametricSurfaceDescriptor): Geometry
const result = wgpu.geometry.parametricSurface(descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `ParametricSurfaceDescriptor` | Yes | 3D sampling function, U/V ranges, grid resolution, sidedness, and invalid-cell policy. |

## Returns
`Geometry` - Indexed sampled surface with computed normals, UVs, and bounds.

## Type Details
### ParametricSurfaceDescriptor

```ts
type ParametricSurfaceDescriptor = {

    f: (u: number, v: number) => [number, number, number];

    uMin?: number;

    uMax?: number;

    vMin?: number;

    vMax?: number;

    uSegments?: number;

    vSegments?: number;

    plane?: "xy" | "xz" | "yz";

    skipInvalid?: boolean;

    doubleSided?: boolean;

};
```

#### ParametricSurfaceDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `f` | `(u: number, v: number) => [number, number, number]` | Yes | Sampling callback used during procedural curve/surface generation. |
| `uMin` | `number` | No | Lower bound of the sampled U interval. |
| `uMax` | `number` | No | Upper bound of the sampled U interval. |
| `vMin` | `number` | No | Lower bound of the sampled V interval. |
| `vMax` | `number` | No | Upper bound of the sampled V interval. |
| `uSegments` | `number` | No | Number of subdivisions along U. |
| `vSegments` | `number` | No | Number of subdivisions along V. |
| `plane` | `"xy" \| "xz" \| "yz"` | No | Plane in which 2D procedural geometry is embedded (`xy`, `xz`, or `yz`). |
| `skipInvalid` | `boolean` | No | Whether cells touching non-finite callback results are omitted. |
| `doubleSided` | `boolean` | No | Whether indices are emitted for both winding directions. |

## See Also
- [geometry.box](./geometry-box.md)
- [geometry.cartesianCurve](./geometry-cartesiancurve.md)
- [geometry.cartesianSurface](./geometry-cartesiansurface.md)
- [geometry.circle](./geometry-circle.md)
- [geometry.custom](./geometry-custom.md)
- [geometry.cylinder](./geometry-cylinder.md)
- [geometry.ellipse](./geometry-ellipse.md)
- [geometry.line](./geometry-line.md)
- [geometry.parametricCurve](./geometry-parametriccurve.md)
- [geometry.plane](./geometry-plane.md)
- [geometry.point](./geometry-point.md)
- [geometry.prism](./geometry-prism.md)
